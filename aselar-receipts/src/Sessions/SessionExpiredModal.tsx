// components/SessionExpiredModal.tsx
import React from 'react';
import styles from './SessionExpiredModal.module.css';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onLoginRedirect: () => void;
  reason?: 'inactivity' | 'navigation' | 'expired';
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onLoginRedirect,
  reason = 'inactivity'
}) => {
  if (!isOpen) return null;

  const getModalContent = () => {
    switch (reason) {
      case 'navigation':
        return {
          title: 'Session Locked',
          message: 'Your session has been locked due to browser navigation. Please log in again to continue.',
          icon: '🔒'
        };
      case 'expired':
        return {
          title: 'Session Expired',
          message: 'Your session has expired. Please log in again to continue.',
          icon: '⏰'
        };
      case 'inactivity':
      default:
        return {
          title: 'Session Locked',
          message: 'Your account has been locked due to inactivity. Please log in again to continue.',
          icon: '🔒'
        };
    }
  };

  const content = getModalContent();

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.iconContainer}>
            <span className={styles.icon}>{content.icon}</span>
          </div>
          
          <h2 className={styles.title}>{content.title}</h2>
          
          <p className={styles.message}>{content.message}</p>
          
          <button 
            onClick={onLoginRedirect}
            className={styles.loginButton}
            autoFocus
          >
            Login Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;