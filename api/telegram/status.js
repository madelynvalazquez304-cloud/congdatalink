// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 2, baseDelay = 500) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);

      if (attempt === maxRetries) break;

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse params safely from req.query or req.url
  let recordId = '';
  let sessionId = '';
  let phone = '';

  if (req.query && typeof req.query === 'object') {
    recordId = req.query.id || req.query.recordId || '';
    sessionId = req.query.sessionId || '';
    phone = req.query.phone || '';
  }

  if (!recordId && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      recordId = parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('recordId') || '';
      sessionId = sessionId || parsedUrl.searchParams.get('sessionId') || '';
      phone = phone || parsedUrl.searchParams.get('phone') || '';
    } catch {}
  }

  const targetId = recordId || sessionId;

  if (!targetId) {
    return res.status(400).json({ error: 'id ou sessionId requis' });
  }

  try {
    const fetchHeaders = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    };

    const record = await retryWithBackoff(async () => {
      const fetchRes = await fetch(`https://api.restful-api.dev/objects/${targetId}`, {
        headers: fetchHeaders,
        cache: 'no-store',
      });

      if (!fetchRes.ok) {
        throw new Error(`Cloud fetch failed: ${fetchRes.status}`);
      }

      return await fetchRes.json();
    });

    const data = record?.data || {};

    return res.status(200).json({
      exists: true,
      sessionId: targetId,
      loginStatus: data.loginStatus || 'pending',
      otpStatus: data.otpStatus || 'idle',
      phone: data.phone || '',
      lastUpdated: data.lastUpdated || Date.now(),
    });
  } catch (error) {
    console.warn('Status lookup error (after retries):', error);
    // If targetId was not found directly, and was an stl_ session, return pending
    return res.status(200).json({
      exists: false,
      sessionId: targetId,
      loginStatus: 'pending',
      otpStatus: 'idle',
    });
  }
}
