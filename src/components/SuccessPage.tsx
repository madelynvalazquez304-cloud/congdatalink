import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AirtelLogo, StarlinkLogo } from './Logos';
import { InternetPlan } from '../types';
import { LanguageSwitch } from './LanguageSwitch';
import { useApp } from '../context/AppContext';
import { CountryInfo } from '../data/countries';
import {
  CheckCircle2,
  RotateCcw,
  Wifi,
  Radio,
  Zap,
  ShieldCheck,
  Activity,
  Smartphone,
  Calendar,
} from 'lucide-react';

interface SuccessPageProps {
  phone: string;
  selectedPlan: InternetPlan;
  sessionId: string;
  country?: CountryInfo;
  fullPhone?: string;
  onReset: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({
  phone,
  selectedPlan,
  sessionId,
  country: propCountry,
  fullPhone: propFullPhone,
  onReset,
}) => {
  const { country: ctxCountry, language, t } = useApp();
  const country = propCountry || ctxCountry;
  const displayPhone = propFullPhone || `${country.dialCode} ${phone}`;

  const [speedTestRunning, setSpeedTestRunning] = useState(false);
  const [testedSpeed, setTestedSpeed] = useState<number | null>(null);
  const [testedPing, setTestedPing] = useState<number | null>(null);

  const txDate = new Date().toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const txRef = `AIR-STL-${Math.floor(100000 + Math.random() * 900000)}-${country.id}`;

  const runSpeedTest = () => {
    setSpeedTestRunning(true);
    setTestedSpeed(null);
    setTestedPing(null);

    setTimeout(() => {
      setTestedSpeed(Math.floor(160 + Math.random() * 90));
      setTestedPing(Math.floor(18 + Math.random() * 10));
      setSpeedTestRunning(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e50000] via-[#c90000] to-[#990000] text-white flex flex-col justify-between selection:bg-amber-400 selection:text-neutral-900">
      {/* Top Header */}
      <header className="w-full border-b border-white/15 bg-black/15 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <AirtelLogo variant="white" className="h-8" />
            <StarlinkLogo className="hidden sm:inline-flex" />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-white/90 bg-white/10 px-2.5 py-1 rounded-xl border border-white/15 flex items-center gap-1.5">
              <span>{country.flag}</span>
              <span>{country.airtelBrand}</span>
            </span>
            <LanguageSwitch variant="transparent" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-8 sm:py-12 flex flex-col items-center">
        {/* Animated Checkmark and Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="flex flex-col items-center text-center mb-8"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-2xl mb-4 relative">
            <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
            <motion.div
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.4, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="absolute inset-0 rounded-full border-4 border-white"
            />
          </div>

          <span className="px-3.5 py-1 rounded-full bg-emerald-500 text-white font-black text-xs uppercase tracking-wider mb-2 shadow-sm">
            {t('validationSuccess')}
          </span>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {t('planActivatedTitle')}
          </h1>
          <p className="text-sm sm:text-base text-white/90 font-medium mt-1 max-w-md">
            {t('planActivatedSubtitle')}
          </p>
        </motion.div>

        {/* Digital Receipt Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="w-full max-w-xl bg-white text-neutral-900 rounded-3xl shadow-2xl p-5 sm:p-8 border border-white/20 relative overflow-hidden"
        >
          {/* Header of receipt */}
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-5 flex-wrap gap-2">
            <AirtelLogo variant="nextgen" className="h-8" />
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                {t('transactionRef')}
              </span>
              <span className="font-mono font-bold text-xs text-neutral-800">{txRef}</span>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 gap-2">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5 shrink-0">
                <Smartphone className="w-4 h-4 text-[#E60000]" /> {t('clientPhone')}
              </span>
              <span className="font-bold text-neutral-900 truncate flex items-center gap-1">
                <span>{country.flag}</span>
                <span>{displayPhone}</span>
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 gap-2">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5 shrink-0">
                <Zap className="w-4 h-4 text-[#E60000]" /> {t('selectedPlanPill')}
              </span>
              <span className="font-extrabold text-[#E60000] text-right truncate">
                {selectedPlan.dataAmount} {selectedPlan.dataUnit} ({selectedPlan.validity})
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 gap-2">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5 shrink-0">
                <Radio className="w-4 h-4 text-neutral-400" /> {t('networkLabel')}
              </span>
              <span className="font-bold text-neutral-800 text-right truncate">
                {country.airtelBrand} x Starlink LEO
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 gap-2">
              <span className="text-neutral-500 font-medium flex items-center gap-1.5 shrink-0">
                <Calendar className="w-4 h-4 text-neutral-400" /> {t('dateLabel')}
              </span>
              <span className="font-semibold text-neutral-700">{txDate}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 gap-2">
              <span className="text-neutral-500 font-medium shrink-0">{t('amountLabel')}</span>
              <span className="font-black text-neutral-900 text-sm sm:text-base">
                {selectedPlan.price}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 gap-2">
              <span className="text-neutral-500 font-medium shrink-0">{t('statusLabel')}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('statusActive')}
              </span>
            </div>
          </div>

          {/* Speed test interactive simulator */}
          <div className="mt-6 pt-5 border-t border-neutral-100 bg-neutral-50/80 -mx-5 sm:-mx-8 -mb-5 sm:-mb-8 p-5 sm:p-8">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#E60000]" />
                <span className="font-extrabold text-xs uppercase tracking-wider text-neutral-800">
                  {t('speedTestTitle')}
                </span>
              </div>

              {testedSpeed !== null && (
                <button
                  type="button"
                  onClick={runSpeedTest}
                  disabled={speedTestRunning}
                  className="text-xs font-bold text-[#E60000] hover:underline cursor-pointer"
                >
                  {t('testAgain')}
                </button>
              )}
            </div>

            {testedSpeed !== null ? (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-sm text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Download Speed
                  </span>
                  <span className="text-2xl font-black text-emerald-600">{testedSpeed} Mbps</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-sm text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Latency (Ping)
                  </span>
                  <span className="text-2xl font-black text-neutral-800">{testedPing} ms</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                id="btn-run-speedtest"
                onClick={runSpeedTest}
                disabled={speedTestRunning}
                className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider transition-all mb-4 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>{speedTestRunning ? t('speedTestRunning') : t('runSpeedTest')}</span>
              </button>
            )}

            <button
              type="button"
              id="btn-return-home"
              onClick={onReset}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#E60000] hover:bg-[#c90000] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-500/20 active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('getAnotherPlan')}</span>
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/15 bg-black/30 backdrop-blur-xl py-6 px-4 text-center text-xs text-white/70">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          <span>© 2026 {country.airtelBrand}</span>
          <span>•</span>
          <span>{t('satellitePartner')}</span>
        </div>
      </footer>
    </div>
  );
};
