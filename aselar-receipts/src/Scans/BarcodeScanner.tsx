// BarcodeScanner.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import styles from './BarcodeScanner.module.css';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isActive: boolean; // lets the parent turn the camera on/off
}

const BEEP_SOUND_URL = '/scan-beep.wav';

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null); // zxing's own stop switch
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  // Prevent the same barcode firing repeatedly while it's still in frame
  const lastScanTimeRef = useRef<number>(0);
  const SCAN_COOLDOWN_MS = 2000;

  const playBeep = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay can be blocked before any user interaction — safe to ignore
      });
    }
  }, []);

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;

    setError(null);
    setIsScanning(true);

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    try {
      const controls = await codeReader.decodeFromConstraints(
        {
          video: {
            facingMode: 'environment', // prefer the back camera on phones/tablets
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            const now = Date.now();

            // Ignore repeat reads of the same code within the cooldown window
            if (code === lastScanned && now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) {
              return;
            }

            lastScanTimeRef.current = now;
            setLastScanned(code);
            playBeep();
            onScan(code);
          }
          // NotFoundException fires continuously while no barcode is in frame —
          // that's normal scanning behavior, not an error to surface to the user
        }
      );

      // Save zxing's own controls so stopScanning can actually release the camera
      controlsRef.current = controls;
    } catch (err) {
      console.error('Scanner start error:', err);
      setError('Could not access the camera. Please check permissions and try again.');
      setIsScanning(false);
    }
  }, [lastScanned, onScan, playBeep]);

  const stopScanning = useCallback(() => {
    // The real fix — tells zxing itself to stop, not just the DOM stream.
    // Without this, the camera indicator light stays on even after
    // clearing the video element's srcObject.
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }

    codeReaderRef.current = null;
    setIsScanning(false);

    // Belt-and-braces: also stop any tracks directly, in case zxing left
    // the element's srcObject populated
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return (
    <div className={styles.scannerContainer}>
      <audio ref={audioRef} src={BEEP_SOUND_URL} preload="auto" />

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.videoWrapper}>
        <video ref={videoRef} className={styles.video} muted playsInline />
        {isScanning && (
          <div className={styles.scanOverlay}>
            <div className={styles.scanBox} />
            <p className={styles.scanHint}>Point camera at barcode</p>
          </div>
        )}
      </div>

      {lastScanned && (
        <p className={styles.lastScannedText}>Last scanned: {lastScanned}</p>
      )}
    </div>
  );
};

export default BarcodeScanner;