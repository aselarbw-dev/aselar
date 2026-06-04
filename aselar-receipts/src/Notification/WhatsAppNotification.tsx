import React, { useEffect, useState } from 'react';
import styles from './WhatsAppNotification.module.css';

const WHATSAPP_NOTICE_KEY = 'whatsapp_notice_seen';

const WhatsAppNotification: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const alreadySeen = localStorage.getItem(WHATSAPP_NOTICE_KEY);
    if (alreadySeen) return;

    // Show after 30 seconds
    const showTimer = setTimeout(() => {
      setIsVisible(true);

      // Auto-hide after 2 minutes (120,000ms)
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        localStorage.setItem(WHATSAPP_NOTICE_KEY, 'true');
      }, 120000);

      return () => clearTimeout(hideTimer);
    }, 30000);

    return () => clearTimeout(showTimer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(WHATSAPP_NOTICE_KEY, 'true');
  };

  if (!isVisible) return null;

  return (
    <div className={styles.notification}>
      <div className={styles.iconWrapper}>
        {/* WhatsApp SVG Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          className={styles.icon}
          fill="white"
        >
          <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.477 2.027 7.788L0 32l8.418-2.01A15.93 15.93 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 0 1-6.77-1.853l-.485-.29-5.003 1.195 1.234-4.863-.317-.5A13.267 13.267 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.77c-.398-.199-2.352-1.16-2.717-1.292-.365-.133-.63-.199-.896.199-.265.398-1.028 1.292-1.26 1.558-.232.265-.465.298-.863.1-.398-.2-1.681-.619-3.2-1.974-1.183-1.054-1.981-2.355-2.213-2.753-.232-.398-.025-.614.174-.812.179-.178.398-.465.597-.698.2-.232.265-.398.398-.664.133-.265.067-.498-.033-.697-.1-.2-.896-2.16-1.228-2.957-.323-.776-.651-.671-.896-.683l-.764-.013c-.265 0-.697.1-1.062.498-.365.398-1.393 1.36-1.393 3.318 0 1.957 1.426 3.849 1.625 4.115.199.265 2.807 4.285 6.802 6.011.951.41 1.693.655 2.272.839.954.304 1.823.261 2.51.158.765-.114 2.352-.961 2.684-1.889.332-.928.332-1.724.232-1.889-.099-.166-.365-.265-.763-.464z" />
        </svg>
      </div>
      <div className={styles.content}>
        <p className={styles.title}>WhatsApp Delivery — Coming Soon</p>
        <p className={styles.message}>
          Sending receipts, quotations, and documents via WhatsApp is currently
          unavailable while we complete our registration with Meta. This feature
          will be fully active soon. We apologise for any inconvenience.
        </p>
      </div>
      <button onClick={handleClose} className={styles.closeButton}>
        &times;
      </button>
    </div>
  );
};

export default WhatsAppNotification;