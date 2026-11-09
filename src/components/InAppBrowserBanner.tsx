import React, { useState, useEffect } from 'react';
import { detectInAppBrowser, getExternalBrowserUrl, safeStorage } from '../utils/safeBrowser';
import { ExternalLink, X, Compass } from 'lucide-react';

export const InAppBrowserBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<{
    isInApp: boolean;
    browserName: string;
    isAndroid: boolean;
  }>({
    isInApp: false,
    browserName: '',
    isAndroid: false,
  });

  useEffect(() => {
    const info = detectInAppBrowser();
    if (info.isInApp) {
      const isDismissed = safeStorage.getItem('airtel_iab_dismissed');
      if (!isDismissed) {
        setBrowserInfo({
          isInApp: true,
          browserName: info.browserName,
          isAndroid: info.isAndroid,
        });
        setShow(true);
      }
    }
  }, []);

  if (!show || !browserInfo.isInApp) {
    return null;
  }

  const handleDismiss = () => {
    setShow(false);
    safeStorage.setItem('airtel_iab_dismissed', 'true');
  };

  const handleOpenExternal = () => {
    const currentUrl = window.location.href;
    if (browserInfo.isAndroid) {
      window.location.href = getExternalBrowserUrl(currentUrl);
    } else {
      // iOS / other: try intent or instruct user
      try {
        window.open(currentUrl, '_blank');
      } catch {}
    }
  };

  return (
    <aside
      aria-label="Conseil navigateur"
      className="w-full bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-neutral-200 border-b border-amber-500/30 px-3 py-2 text-xs select-none relative z-50 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </span>
          <p className="truncate text-[11px] sm:text-xs">
            <span className="font-bold text-amber-300">
              {browserInfo.browserName || 'Navigateur intégré'} :
            </span>{' '}
            Pour éviter les blocages de session, appuyez sur <span className="font-bold text-white">⋮</span> puis{' '}
            <span className="underline decoration-amber-400/50">Ouvrir dans le navigateur</span>.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {browserInfo.isAndroid && (
            <button
              onClick={handleOpenExternal}
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium text-[11px] transition-colors"
            >
              <span>Chrome</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={handleDismiss}
            type="button"
            className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            title="Masquer"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
