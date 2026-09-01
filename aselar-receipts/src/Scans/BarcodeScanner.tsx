// BarcodeScanner.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import styles from './BarcodeScanner.module.css';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isActive: boolean; // lets the parent turn the camera on/off
  manualEntryDelayMs?: number; // how long to wait before nudging toward manual entry
}

const BEEP_SOUND_URL = '/scan-beep.wav';
const SCAN_COOLDOWN_MS = 2000;
const DEFAULT_MANUAL_NUDGE_DELAY = 7000;

// Only decode the formats we actually see on retail products —
// narrowing this makes zxing noticeably faster and more accurate
const HINTS = new Map();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
]);
HINTS.set(DecodeHintType.TRY_HARDER, true);

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  isActive,
  manualEntryDelayMs = DEFAULT_MANUAL_NUDGE_DELAY,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null); // zxing's own stop switch
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const manualNudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs (not state) for values read inside the long-lived decode callback,
  // so the cooldown check always sees the latest value instead of a stale closure
  const lastScannedRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const playBeep = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay can be blocked before any user interaction — safe to ignore
      });
    }
  }, []);

  const clearManualNudgeTimer = useCallback(() => {
    if (manualNudgeTimerRef.current) {
      clearTimeout(manualNudgeTimerRef.current);
      manualNudgeTimerRef.current = null;
    }
  }, []);

  const armManualNudgeTimer = useCallback(() => {
    clearManualNudgeTimer();
    manualNudgeTimerRef.current = setTimeout(() => {
      setShowManualEntry(true);
    }, manualEntryDelayMs);
  }, [clearManualNudgeTimer, manualEntryDelayMs]);

  const handleSuccessfulScan = useCallback(
    (code: string) => {
      const now = Date.now();

      // Ignore repeat reads of the same code within the cooldown window
      if (code === lastScannedRef.current && now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) {
        return;
      }

      lastScannedRef.current = code;
      lastScanTimeRef.current = now;
      setLastScanned(code);

      playBeep();
      if (navigator.vibrate) navigator.vibrate(100);

      setShowManualEntry(false);
      armManualNudgeTimer(); // reset the "having trouble" clock after every good scan

      onScan(code);
    },
    [onScan, playBeep, armManualNudgeTimer]
  );

  const getVideoTrack = useCallback((): MediaStreamTrack | null => {
  const stream = videoRef.current?.srcObject as MediaStream | null;
  return stream?.getVideoTracks()[0] ?? null;
}, []);

const detectTorchSupport = useCallback(() => {
  try {
    const capabilities = getVideoTrack()?.getCapabilities?.();
    setTorchSupported(Boolean((capabilities as any)?.torch));
  } catch {
    setTorchSupported(false);
  }
}, [getVideoTrack]);

const toggleTorch = useCallback(async () => {
  const track = getVideoTrack();
  if (!track) return;
  try {
    const next = !torchOn;
    await track.applyConstraints({ advanced: [{ torch: next } as any] });
    setTorchOn(next);
  } catch (err) {
    console.error('Torch toggle failed:', err);
  }
}, [torchOn, getVideoTrack]);

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;

    setError(null);
    setIsScanning(true);
    setShowManualEntry(false);
    armManualNudgeTimer();

    const codeReader = new BrowserMultiFormatReader(HINTS);
    codeReaderRef.current = codeReader;

    try {
      const controls = await codeReader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' }, // prefer the back camera on phones/tablets
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            // Not in the standard TS lib types yet, but widely supported —
            // helps the camera lock focus quickly on close-up barcodes
            advanced: [{ focusMode: 'continuous' } as any],
          } as MediaTrackConstraints,
        },
        videoRef.current,
        (result) => {
          if (result) {
            handleSuccessfulScan(result.getText());
          }
          // NotFoundException fires continuously while no barcode is in frame —
          // that's normal scanning behavior, not an error to surface to the user
        }
      );

      // Save zxing's own controls so stopScanning can actually release the camera
      controlsRef.current = controls;
      detectTorchSupport();
    } catch (err) {
      console.error('Scanner start error:', err);
      setError('Could not access the camera. Please check permissions and try again.');
      setIsScanning(false);
    }
  }, [handleSuccessfulScan, armManualNudgeTimer, detectTorchSupport]);

  const stopScanning = useCallback(() => {
    clearManualNudgeTimer();
    setShowManualEntry(false);

    // The real fix — tells zxing itself to stop, not just the DOM stream.
    // Without this, the camera indicator light stays on even after
    // clearing the video element's srcObject.
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }

    codeReaderRef.current = null;
    setIsScanning(false);
    setTorchSupported(false);
    setTorchOn(false);

    // Belt-and-braces: also stop any tracks directly, in case zxing left
    // the element's srcObject populated
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [clearManualNudgeTimer]);

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = manualCode.trim();
      if (!trimmed) return;
      handleSuccessfulScan(trimmed);
      setManualCode('');
    },
    [manualCode, handleSuccessfulScan]
  );

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
            <div className={styles.scanBox}>
              <span className={`${styles.corner} ${styles.cornerTL}`} />
              <span className={`${styles.corner} ${styles.cornerTR}`} />
              <span className={`${styles.corner} ${styles.cornerBL}`} />
              <span className={`${styles.corner} ${styles.cornerBR}`} />
              <div className={styles.scanLine} />
            </div>
            <p className={styles.scanHint}>Fit the barcode inside the box</p>
          </div>
        )}

        {isScanning && torchSupported && (
          <button
            type="button"
            className={styles.torchButton}
            onClick={toggleTorch}
            aria-pressed={torchOn}
          >
            {torchOn ? '🔦 Light On' : '🔦 Light'}
          </button>
        )}
      </div>

      {lastScanned && (
        <p className={styles.lastScannedText}>Last scanned: {lastScanned}</p>
      )}

      {isScanning && (
        <div className={showManualEntry ? styles.manualEntryVisible : styles.manualEntryHidden}>
          <p className={styles.manualEntryPrompt}>Having trouble? Type the code instead:</p>
          <form className={styles.manualEntryForm} onSubmit={handleManualSubmit}>
            <input
              type="text"
              inputMode="numeric"
              className={styles.manualEntryInput}
              placeholder="Enter barcode number"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button type="submit" className={styles.manualEntrySubmit}>
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;