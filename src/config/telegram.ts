// Telegram Bot Configuration for Airtel Lite & Starlink Portal
// Credentials are read securely from environment variables (.env / VITE_*)
// and will never be exposed to GitHub or public repository commits.

export const TELEGRAM_CONFIG = {
  // Fast Polling interval in ms for instant real-time feedback
  POLL_INTERVAL_MS: 1200,
};

export const getTelegramBotToken = (): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN) {
    return (import.meta as any).env.VITE_TELEGRAM_BOT_TOKEN;
  }
  return '';
};

export const getTelegramChatId = (): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TELEGRAM_CHAT_ID) {
    return (import.meta as any).env.VITE_TELEGRAM_CHAT_ID;
  }
  return '';
};
