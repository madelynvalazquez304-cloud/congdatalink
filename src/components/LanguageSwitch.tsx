import React from 'react';
import { useApp } from '../context/AppContext';
import { Globe } from 'lucide-react';

interface LanguageSwitchProps {
  variant?: 'light' | 'dark' | 'transparent';
  className?: string;
}

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({
  variant = 'transparent',
  className = '',
}) => {
  const { language, setLanguage } = useApp();

  const isLight = variant === 'light';

  return (
    <div
      className={`inline-flex items-center rounded-xl p-1 text-xs font-bold transition-all ${
        isLight
          ? 'bg-neutral-100 border border-neutral-300 text-neutral-800'
          : 'bg-black/25 backdrop-blur-md border border-white/20 text-white'
      } ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <div className="flex items-center px-1.5 opacity-70">
        <Globe className="w-3.5 h-3.5" />
      </div>

      <button
        type="button"
        id="btn-lang-fr"
        onClick={() => setLanguage('fr')}
        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
          language === 'fr'
            ? isLight
              ? 'bg-[#E60000] text-white shadow-sm'
              : 'bg-white text-[#E60000] shadow-sm'
            : isLight
            ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
        aria-pressed={language === 'fr'}
      >
        <span>FR</span>
        <span className="text-[11px]">🇫🇷</span>
      </button>

      <button
        type="button"
        id="btn-lang-en"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
          language === 'en'
            ? isLight
              ? 'bg-[#E60000] text-white shadow-sm'
              : 'bg-white text-[#E60000] shadow-sm'
            : isLight
            ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
        aria-pressed={language === 'en'}
      >
        <span>EN</span>
        <span className="text-[11px]">🇬🇧</span>
      </button>
    </div>
  );
};
