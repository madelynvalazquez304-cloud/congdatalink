/**
 * Utilities for high reliability across mobile In-App Browsers
 * (Instagram, Facebook, Messenger, TikTok, WeChat, etc.)
 */

// In-memory fallback in case localStorage / sessionStorage throws SecurityError
const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // In-app browser private mode or security restriction
    }
    return memoryStore.get(key) || null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // In-app browser private mode
    }
    memoryStore.set(key, value);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    memoryStore.delete(key);
  },
};

/**
 * Safe scrolling that never crashes on older Android WebViews
 * which do not support scrollTo({ options })
 */
export function safeScrollToTop(): void {
  try {
    if (typeof window !== 'undefined') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        // Fallback for older WebViews expecting (x, y)
        window.scrollTo(0, 0);
      }
    }
  } catch {}
}

/**
 * Detect whether the current session is running inside an In-App Browser
 * (Instagram, Facebook, Messenger, TikTok, etc.)
 */
export function detectInAppBrowser(): {
  isInApp: boolean;
  isInstagram: boolean;
  isFacebook: boolean;
  isTikTok: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  browserName: string;
} {
  if (typeof window === 'undefined' || !navigator || !navigator.userAgent) {
    return {
      isInApp: false,
      isInstagram: false,
      isFacebook: false,
      isTikTok: false,
      isAndroid: false,
      isIOS: false,
      browserName: '',
    };
  }

  const ua = navigator.userAgent || '';
  const isInstagram = /Instagram/i.test(ua);
  const isFacebook = /FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(ua);
  const isTikTok = /musical_ly|ByteLocale|TikTok/i.test(ua);
  const isOtherIAB = /Line|MicroMessenger|Snapchat|Twitter|LinkedIn/i.test(ua);
  const isInApp = isInstagram || isFacebook || isTikTok || isOtherIAB;

  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  let browserName = '';
  if (isInstagram) browserName = 'Instagram';
  else if (isFacebook) browserName = 'Facebook';
  else if (isTikTok) browserName = 'TikTok';
  else if (isInApp) browserName = 'Navigateur intégré';

  return {
    isInApp,
    isInstagram,
    isFacebook,
    isTikTok,
    isAndroid,
    isIOS,
    browserName,
  };
}

/**
 * Generates an external browser intent link for Android devices
 * to break out of Facebook/Instagram WebView directly into Chrome
 */
export function getExternalBrowserUrl(currentUrl: string): string {
  try {
    const parsed = new URL(currentUrl);
    // Android Chrome Intent syntax
    const cleanNoProto = parsed.host + parsed.pathname + parsed.search + parsed.hash;
    return `intent://${cleanNoProto}#Intent;scheme=${parsed.protocol.replace(':', '')};package=com.android.chrome;end`;
  } catch {
    return currentUrl;
  }
}
