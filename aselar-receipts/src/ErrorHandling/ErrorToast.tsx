// components/ErrorToast.tsx
import React, { useEffect, useState } from 'react';
import styles from './ErrorToast.module.css';

type ErrorToastProps = {
  title: string;
  message: string;
  emoji?: string;
};

const ErrorToast: React.FC<ErrorToastProps> = ({ title, message, emoji = '❌' }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.toast}>
      <span className={styles.emoji}>{emoji}</span>
      <div className={styles.text}>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default ErrorToast;
