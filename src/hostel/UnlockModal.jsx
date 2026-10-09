import { useState, useEffect, useRef } from 'react';
import { useUnlock } from './UnlockContext';

export default function UnlockModal() {
  const {
    isModalOpen,
    closeUnlockModal,
    unlock,
    isDerivingKey,
    unlockError,
    cooldownSeconds
  } = useUnlock();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isModalOpen) {
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isModalOpen]);

  // Trap focus & handle Esc key
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDerivingKey) {
        closeUnlockModal();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isDerivingKey, closeUnlockModal]);

  if (!isModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || isDerivingKey || cooldownSeconds > 0) return;
    try {
      await unlock(password);
    } catch {
      // Error is stored in context and rendered
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !isDerivingKey && closeUnlockModal()} role="presentation">
      <div
        className="unlock-modal card"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-title"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={closeUnlockModal}
          disabled={isDerivingKey}
          aria-label="Close unlock modal"
        >
          ✕
        </button>

        <div className="modal-icon-badge">🔒</div>
        <h2 id="unlock-title">Unlock Private Details</h2>
        <p className="modal-copy">
          Private details are protected. Enter the access password to view mobile numbers and family details.
        </p>

        <form onSubmit={handleSubmit} className="unlock-form">
          <div className="password-input-wrapper">
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              className="unlock-input"
              placeholder="Enter master password..."
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isDerivingKey || cooldownSeconds > 0}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="toggle-pw-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={isDerivingKey || cooldownSeconds > 0}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {cooldownSeconds > 0 && (
            <div className="cooldown-warning" role="alert">
              ⏳ Throttled: Please wait <strong>{cooldownSeconds}s</strong> before trying again.
            </div>
          )}

          {unlockError && cooldownSeconds === 0 && (
            <div className="unlock-error" role="alert">
              ⚠️ {unlockError}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeUnlockModal}
              disabled={isDerivingKey}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary unlock-submit-btn"
              disabled={!password.trim() || isDerivingKey || cooldownSeconds > 0}
            >
              {isDerivingKey ? (
                <>
                  <span className="btn-spinner" aria-hidden="true"></span>
                  <span>Verifying Key...</span>
                </>
              ) : (
                'Unlock Data'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
