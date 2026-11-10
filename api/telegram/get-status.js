// Simple in-memory state storage (works on Vercel serverless)
// For production, use a proper database like Redis or Supabase

const sessionState = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sessionId } = req.query || {};

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    const status = sessionState.get(sessionId) || {
      loginStatus: 'pending',
      otpStatus: 'idle',
      lastUpdated: Date.now(),
    };

    return res.status(200).json(status);
  } catch (error) {
    console.error('get-status error:', error);
    return res.status(500).json({ error: error.message });
  }
}
