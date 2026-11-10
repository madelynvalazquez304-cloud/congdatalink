// Simple in-memory state storage (works on Vercel serverless)
// For production, use a proper database like Redis or Supabase

const sessionState = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sessionId, loginStatus, otpStatus } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    // Update state
    const current = sessionState.get(sessionId) || {};
    if (loginStatus) current.loginStatus = loginStatus;
    if (otpStatus) current.otpStatus = otpStatus;
    current.lastUpdated = Date.now();
    sessionState.set(sessionId, current);

    console.log('[set-status] Updated for session:', sessionId, current);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('set-status error:', error);
    return res.status(500).json({ error: error.message });
  }
}
