import React, { Component, ErrorInfo, ReactNode } from 'react';
import { detectInAppBrowser, getExternalBrowserUrl } from '../utils/safeBrowser';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erreur inconnue',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App runtime error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      window.location.href = window.location.href;
    }
  };

  private handleOpenExternal = () => {
    const { isAndroid } = detectInAppBrowser();
    const currentUrl = window.location.href;
    if (isAndroid) {
      window.location.href = getExternalBrowserUrl(currentUrl);
    } else {
      // On iOS or others, attempt opening or copy
      window.open(currentUrl, '_system');
    }
  };

  public render() {
    if (this.state.hasError) {
      const { isInApp, browserName } = detectInAppBrowser();

      return (
        <div className="min-h-screen min-h-[100dvh] w-full bg-neutral-900 text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center mb-6 shadow-xl shadow-red-900/30">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight mb-2 text-white">
            Chargement interrompu
          </h1>

          <p className="text-sm text-neutral-300 max-w-sm mb-6 leading-relaxed">
            {isInApp
              ? `Le navigateur intégré ${browserName || ''} a restreint l'affichage. Vous pouvez recharger la page ou ouvrir le portail dans votre navigateur standard.`
              : 'Une interruption temporaire est survenue lors du chargement. Veuillez actualiser la page.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 rounded-xl font-bold bg-red-600 hover:bg-red-700 active:scale-95 text-white transition-all shadow-lg shadow-red-900/40 cursor-pointer"
            >
              Actualiser la page
            </button>

            {isInApp && (
              <button
                onClick={this.handleOpenExternal}
                className="w-full py-3 px-4 rounded-xl font-semibold bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 border border-neutral-700 transition-all cursor-pointer"
              >
                Ouvrir dans Chrome / Safari
              </button>
            )}
          </div>

          {isInApp && (
            <p className="text-xs text-neutral-400 mt-6 max-w-xs">
              Astuce : appuyez sur les trois points (•••) en haut à droite de l'écran, puis choisissez &quot;Ouvrir dans le navigateur&quot;.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
