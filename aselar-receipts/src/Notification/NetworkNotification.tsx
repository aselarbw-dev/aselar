import React, { useEffect, useState } from 'react';
import styles from './NetworkNotification.module.css'; // Import CSS Module

const NetworkNotification: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine); // Check initial online status
  const [isVisible, setIsVisible] = useState(false); // Control visibility of the notification

  useEffect(() => {
    // Update online status when connection changes
    const handleOnline = () => {
      setIsOnline(true);
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000); // Hide after 5 seconds
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsVisible(true);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close notification manually
  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null; // Don't render if not visible

  return (
    <div
      className={`${styles.notification} ${
        isOnline ? styles.online : styles.offline
      }`}
    >
      <span>
        {isOnline ? 'You are back online!' : 'You may be offline. Check your internet connection.'}
      </span>
      <button onClick={handleClose} className={styles.closeButton}>
        &times;
      </button>
    </div>
  );
};

export default NetworkNotification;