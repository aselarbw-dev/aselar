// components/NotFound.tsx
import React from 'react';
import styles from './NotFound.module.css';
import { useNavigate } from 'react-router-dom'; // Assuming React Router v6+

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    // Optional: Navigate back or to home on close
    navigate('/', { replace: true });
  };

  const handleLogin = () => {
    navigate('/sign-in', { replace: true });
  };

  const handleHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
          ×
        </button>
        <div className={styles.content}>
          <div className={styles.emoji}>😵‍💫</div>
          <h1 className={styles.title}>404 - Page Not Found</h1>
          <p className={styles.description}>
            Oops! The page you're looking for doesn't exist or has moved.
          </p>
          <div className={styles.buttons}>
            <button className={styles.button} onClick={handleLogin}>
              Go to Login
            </button>
            <button className={styles.button} onClick={handleHome}>
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;