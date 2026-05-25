import React, { useState } from 'react';
import QrScanner from 'react-qr-scanner';
import styles from './QRScanner.module.css';

const QRScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = (data: string | null) => {
    if (data) {
      setScanResult(data);
      setShowScanner(false);
      window.open(data, '_blank'); // Open PDF URL
    }
  };

  const handleError = (err: any) => {
    console.error(err);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => setShowScanner(true)}
        className={`${styles.button} ${styles.scanButton}`}
      >
        Scan Quote QR
      </button>

      {showScanner && (
        <div className={styles.overlay}>
          <div className={styles.scannerContainer}>
            <QrScanner
              delay={300}
              onError={handleError}
              onScan={handleScan}
              facingMode="environment" // Back camera
              style={{ width: '100%' }}
            />
          </div>
          <button
            onClick={() => setShowScanner(false)}
            className={`${styles.button} ${styles.cancelButton}`}
          >
            Cancel
          </button>
        </div>
      )}

      {scanResult && (
        <p className={styles.resultText}>
          Scanned URL: {scanResult}
        </p>
      )}
    </div>
  );
};

export default QRScanner;

