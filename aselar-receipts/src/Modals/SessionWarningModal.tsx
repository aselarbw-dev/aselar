// components/SessionWarningModal.tsx
import React, { useState, useEffect } from 'react';

import styles from './SessionWarningModal.module.css';

interface SessionWarningModalProps {
  isOpen: boolean;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  onExtend,
  onLogout
}) => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(30);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onLogout]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={e => e.stopPropagation()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Session Expiring</h3>
          <div className={styles.countdown}>{countdown}s</div>
        </div>
        
        <div className={styles.content}>
          <p>
            Your session will expire in <strong>{countdown} seconds</strong> due to inactivity.
          </p>
          <p>
            Would you like to continue working?
          </p>
        </div>
        
        <div className={styles.actions}>
          <button 
            className={styles.extendButton}
            onClick={onExtend}
          >
            Continue Working
          </button>
          <button 
            className={styles.logoutButton}
            onClick={onLogout}
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
};

