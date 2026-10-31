// SellerNameProvider.tsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import styles from './SellerNameProvider.module.css';

const API_BASE = `${import.meta.env.VITE_AUTH_SERVICE_URL}api/seller`;
const RECHECK_INTERVAL_MS = 5 * 60 * 1000; // silent background re-verify every 5 minutes
const VERIFY_TTL_MS = 5 * 60 * 1000;       // a verification stays "fresh" for 5 minutes
const FOCUS_MIN_GAP_MS = 60 * 1000;        // tab-focus re-check at most once a minute
const REQUEST_TIMEOUT_MS = 8000;

// Only used to tell the server which day a login belongs to (the server keeps a log).
// It is NOT used to decide who the seller is, so nothing happens at midnight any more.
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().slice(0, 10); // YYYY-MM-DD format
};

// Decode the JWT payload to get the user id, without needing a verification
// library on the frontend — we're just reading the payload, the backend
// already verifies the signature on every request.
const getUserIdFromToken = (): string | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadBase64));
    return payload.id || null;
  } catch (err) {
    console.error('Failed to decode token payload:', err);
    return null;
  }
};

// CHANGED: the seller belongs to THIS DEVICE until they switch or log out. No date in the key.
// (AuthContext clears every key starting with "sellerName_" when someone logs out.)
const getSellerKey = (userId: string) => `sellerName_${userId}`;

// NEW: the last seller confirmed on this device. It survives logout and is only used to offer a
// "Continue as ..." button, never to log anyone in silently.
const getHintKey = (userId: string) => `lastSellerName_${userId}`;

// NEW: reads the stored seller. Also moves over a name saved by the old per-day version of this
// provider, so nobody is asked again just because the app was updated.
const readStoredSeller = (userId: string | null): string => {
  if (!userId) return '';

  const current = localStorage.getItem(getSellerKey(userId));
  if (current) return current;

  const oldKey = `sellerName_${userId}_${getTodayDate()}`;
  const old = localStorage.getItem(oldKey);
  if (old) {
    localStorage.setItem(getSellerKey(userId), old);
    localStorage.removeItem(oldKey);
    return old;
  }

  return '';
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// Lives at module level so it survives the provider being remounted by route changes.
// It resets on a full page refresh, which is when we want one real server check.
let lastVerified: { userId: string; at: number } | null = null;

const isRecentlyVerified = (userId: string, maxAgeMs: number): boolean =>
  !!lastVerified && lastVerified.userId === userId && Date.now() - lastVerified.at < maxAgeMs;

interface SellerContextType {
  sellerName: string;
  // NEW: hand the till to someone else. Clears the seller and shows the popup.
  // It replaces the screen behind it, so use it between sales, not in the middle of one.
  switchSeller: () => void;
}

const SellerContext = createContext<SellerContextType>({ sellerName: '', switchSeller: () => {} });

export const useSellerContext = () => useContext(SellerContext);

interface SellerNameProviderProps {
  children: React.ReactNode;
}

const SellerNameProvider: React.FC<SellerNameProviderProps> = ({ children }) => {
  const [userId] = useState<string | null>(() => getUserIdFromToken());

  // Initial state is read synchronously from localStorage, so nothing flashes and nothing blocks the screen
  const [sellerName, setSellerName] = useState<string>(() => readStoredSeller(userId));
  const [showPrompt, setShowPrompt] = useState<boolean>(() => !!userId && !readStoredSeller(userId));
  const [inputName, setInputName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [ownerNotice, setOwnerNotice] = useState<string>(''); // set on first-time owner registration

  const inFlightRef = useRef<boolean>(false);

  // CHANGED: re-check with the READ-ONLY verify endpoint. It only asks "is this name still an active
  // seller?" and never writes anything. The old version re-registered the name on every check, which
  // made the shared per-day record flip between devices.
  const verifyStoredSeller = useCallback(async () => {
    if (inFlightRef.current || !userId) return; // never run two checks at once

    const key = getSellerKey(userId);
    const storedName = localStorage.getItem(key);
    if (!storedName) return; // the popup is (or is about to be) showing

    inFlightRef.current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: storedName }),
        credentials: 'include',
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Keep the official spelling from the admin's list (capital letters etc.)
        const officialName: string = data.name || storedName;
        if (officialName !== storedName) {
          localStorage.setItem(key, officialName);
          setSellerName(officialName);
        }
        localStorage.setItem(getHintKey(userId), officialName);
        lastVerified = { userId, at: Date.now() };
      } else if (response.status === 403 && data.code === 'SELLER_NOT_AUTHORIZED') {
        // Removed/deactivated/renamed by the admin: the ONLY case that sends a seller back to the popup
        localStorage.removeItem(key);
        localStorage.removeItem(getHintKey(userId));
        lastVerified = null;
        setSellerName('');
        setInputName('');
        setError('This seller name is no longer authorised. Enter a valid seller name or contact the admin.');
        setShowPrompt(true);
      }
      // Anything else (401, 5xx, an older server without this endpoint ...): keep working with the
      // stored name. A dead login is handled by the app-wide session handling, not here.
    } catch (err) {
      // Network problem or timeout: keep working with the stored name
      console.error('Seller verification failed:', err);
    } finally {
      window.clearTimeout(timeout);
      inFlightRef.current = false;
    }
  }, [userId]);

  // Verify once on mount (unless it was verified recently), then quietly now and then
  useEffect(() => {
    if (!userId) return;

    if (!isRecentlyVerified(userId, VERIFY_TTL_MS)) {
      void verifyStoredSeller();
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (isRecentlyVerified(userId, FOCUS_MIN_GAP_MS)) return;
      void verifyStoredSeller();
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(() => {
      void verifyStoredSeller();
    }, RECHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [userId, verifyStoredSeller]);

  // NEW: keep several open tabs of the same device in step (a seller switched or logged out in another tab)
  useEffect(() => {
    if (!userId) return;
    const key = getSellerKey(userId);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      if (event.newValue) {
        setSellerName(event.newValue);
        setShowPrompt(false);
      } else {
        setSellerName('');
        setShowPrompt(true);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  // NEW: hand the till to someone else without logging out of the account
  const switchSeller = useCallback(() => {
    if (!userId) return;
    localStorage.removeItem(getSellerKey(userId)); // the "Continue as ..." hint is kept
    lastVerified = null;
    setSellerName('');
    setInputName('');
    setError('');
    setShowPrompt(true);
  }, [userId]);

  // Registers the name with the server (this is also where the very first owner name is created).
  // The server checks it against the admin's list and answers with the official spelling.
  const submitSeller = async (rawName: string) => {
    const trimmedName = rawName.trim();
    if (!trimmedName) {
      setError('Seller name is required.');
      return;
    }

    if (!userId) {
      setError('Session not found. Please log in again.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: trimmedName, date: getTodayDate() }),
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 403) {
          setError(data.error || 'Seller name not recognised. Ask the admin to add you.');
        } else if (response.status === 401) {
          setError('Your login has expired. Please log in again.');
        } else {
          setError(data.error || data.message || `Server error: ${response.status}`);
        }
        return; // do NOT proceed to the dashboard
      }

      // Use the official name stored in the system (not what was typed)
      const officialName: string = data.name || trimmedName;
      localStorage.setItem(getSellerKey(userId), officialName);
      localStorage.setItem(getHintKey(userId), officialName);
      lastVerified = { userId, at: Date.now() }; // just verified by the server
      setSellerName(officialName);
      setShowPrompt(false);
      setInputName('');

      // First time on this account: tell the owner not to forget this name
      if (data.firstTimeSetup) {
        setOwnerNotice(officialName);
      }
    } catch (err) {
      console.error('Server save failed:', err);
      setError('Could not reach the server to verify your name. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitSeller(inputName);
  };

  // One-time owner notice
  if (ownerNotice) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <h2>Welcome, Owner</h2>
          <p>
            You have been registered as the <strong>owner</strong> of this account with the name:
          </p>
          <p className={styles.ownerName}>{ownerNotice}</p>
          <p className={styles.notice}>
            <strong>Do not forget this name.</strong> You will need to type it exactly when you log
            in. It cannot be removed, and it is the only way to access your account as the
            owner. Add your team's seller names from the seller management page.
          </p>
          <button
            type="button"
            className={styles.submitButton}
            onClick={() => setOwnerNotice('')}
          >
            I have noted my name
          </button>
        </div>
      </div>
    );
  }

  if (showPrompt) {
    // The last seller on this device is offered as a clear, deliberate button, never filled in for them
    const lastSeller = userId ? localStorage.getItem(getHintKey(userId)) : null;

    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <h2>Sellers Name </h2>
          <p>This name will be displayed on receipts, quotations, and invoices until you log out or switch seller.</p>
          <p className={styles.notice}>
            Enter the seller name exactly as registered by the admin. If this is your first time
            opening this account, the name you enter becomes the owner name.
          </p>

          {lastSeller && (
            <button
              type="button"
              className={styles.submitButton}
              style={{ marginBottom: '0.75rem' }}
              onClick={() => void submitSeller(lastSeller)}
              disabled={submitting}
            >
              {submitting ? 'Verifying...' : `Continue as ${lastSeller}`}
            </button>
          )}

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder={lastSeller ? 'Or enter a different seller name' : 'Seller Name'}
              className={styles.input}
              disabled={submitting}
              autoFocus={!lastSeller}
            />
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? 'Verifying...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <SellerContext.Provider value={{ sellerName, switchSeller }}>
      {children}
    </SellerContext.Provider>
  );
};

export default SellerNameProvider;