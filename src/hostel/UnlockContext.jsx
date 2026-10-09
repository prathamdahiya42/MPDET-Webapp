import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { decryptHostelData } from './crypto';
import { loadHostelEncryptedEnvelope } from './hostelLoader';

const UnlockContext = createContext(null);

export function UnlockProvider({ children }) {
  // Plaintext data is stored exclusively in React memory state.
  // Never written to localStorage, sessionStorage, IndexedDB, or cookies.
  const [privateRecords, setPrivateRecords] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDerivingKey, setIsDerivingKey] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const isUnlocked = privateRecords !== null;

  // Inactivity & Visibility timers
  const inactivityTimerRef = useRef(null);
  const hiddenTimerRef = useRef(null);
  const cooldownIntervalRef = useRef(null);

  const lock = useCallback(() => {
    setPrivateRecords(null);
    setUnlockError('');
  }, []);

  // Reset 5-minute inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (!isUnlocked) return;

    inactivityTimerRef.current = setTimeout(() => {
      lock();
    }, 5 * 60 * 1000); // 5 minutes of inactivity
  }, [isUnlocked, lock]);

  // Activity listeners
  useEffect(() => {
    if (!isUnlocked) return;

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetInactivityTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isUnlocked, resetInactivityTimer]);

  // Tab visibility change (lock if hidden for 2 minutes)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (isUnlocked) {
          hiddenTimerRef.current = setTimeout(() => {
            lock();
          }, 2 * 60 * 1000); // 2 minutes hidden
        }
      } else {
        if (hiddenTimerRef.current) {
          clearTimeout(hiddenTimerRef.current);
          hiddenTimerRef.current = null;
        }
        resetInactivityTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
    };
  }, [isUnlocked, lock, resetInactivityTimer]);

  // Cooldown countdown interval
  useEffect(() => {
    if (cooldownSeconds > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownSeconds(prev => {
          if (prev <= 1) {
            clearInterval(cooldownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, [cooldownSeconds]);

  const unlock = async (password) => {
    if (cooldownSeconds > 0) {
      throw new Error(`Too many attempts. Please wait ${cooldownSeconds} seconds.`);
    }

    setIsDerivingKey(true);
    setUnlockError('');

    try {
      const envelope = await loadHostelEncryptedEnvelope();
      const records = await decryptHostelData(password, envelope);

      // Decryption successful: store decrypted map in React memory state only
      setPrivateRecords(records);
      setFailedAttempts(0);
      setIsModalOpen(false);
      return true;
    } catch (err) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      // UI throttle: 5 wrong attempts -> 30s cooldown, doubling each time.
      // Honest note: this throttling is a client UX measure to discourage casual guessing.
      // The true cryptographic security comes from the high PBKDF2 cost (600,000 iterations)
      // and entropy of the master password.
      if (nextFailures >= 5) {
        const exponent = nextFailures - 5;
        const penalty = Math.min(30 * Math.pow(2, exponent), 600); // capped at 10 minutes
        setCooldownSeconds(penalty);
      }

      const msg = err.message === 'Incorrect password' ? 'Incorrect password' : (err.message || 'Decryption failed');
      setUnlockError(msg);
      throw new Error(msg);
    } finally {
      setIsDerivingKey(false);
    }
  };

  const getPrivateRecord = useCallback((id) => {
    if (!privateRecords || !id) return null;
    return privateRecords[id] || null;
  }, [privateRecords]);

  return (
    <UnlockContext.Provider
      value={{
        isUnlocked,
        privateRecords,
        isModalOpen,
        openUnlockModal: () => setIsModalOpen(true),
        closeUnlockModal: () => {
          setIsModalOpen(false);
          setUnlockError('');
        },
        lock,
        unlock,
        isDerivingKey,
        unlockError,
        failedAttempts,
        cooldownSeconds,
        getPrivateRecord
      }}
    >
      {children}
    </UnlockContext.Provider>
  );
}

export function useUnlock() {
  const ctx = useContext(UnlockContext);
  if (!ctx) throw new Error('useUnlock must be used within an UnlockProvider');
  return ctx;
}
