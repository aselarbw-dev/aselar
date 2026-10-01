// SellerNameProvider.tsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import styles from './SellerNameProvider.module.css';

const API_BASE = `${import.meta.env.VITE_AUTH_SERVICE_URL}api/seller`;
const RECHECK_INTERVAL_MS = 5 * 60 * 1000; // silent background re-verify every 5 minutes
const VERIFY_TTL_MS = 5 * 60 * 1000;       // a verification stays "fresh" for 5 minutes
const FOCUS_MIN_GAP_MS = 60 * 1000;        // tab-focus re-check at most once a minute
const REQUEST_TIMEOUT_MS = 8000;

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
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.id || null;
  } catch (err) {
    console.error('Failed to decode token payload:', err);
    return null;
  }
};

const getSellerKey = (userId: string, date: string) => `sellerName_${userId}_${date}`;

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// Lives at module level so it survives the provider being remounted by route changes.
// It resets on a full page refresh, which is when we want one real server check.
let lastVerified: { key: string; at: number } | null = null;

const isRecentlyVerified = (key: string, maxAgeMs: number): boolean =>
  !!lastVerified && lastVerified.key === key && Date.now() - lastVerified.at < maxAgeMs;

// Read today's stored seller key for the logged-in user (if any)
const getCurrentKey = (): string | null => {
  const userId = getUserIdFromToken();
  return userId ? getSellerKey(userId, getTodayDate()) : null;
};

interface SellerContextType {
  sellerName: string;
}

const SellerContext = createContext<SellerContextType>({ sellerName: '' });

export const useSellerContext = () => useContext(SellerContext);

interface SellerNameProviderProps {
  children: React.ReactNode;
}

const SellerNameProvider: React.FC<SellerNameProviderProps> = ({ children }) => {
  // Initial state is read synchronously from localStorage, so remounts don't flash anything
  const [sellerName, setSellerName] = useState<string>(() => {
    const key = getCurrentKey();
    return key ? localStorage.getItem(key) || '' : '';
  });
  // Only block the screen when there is a stored name that hasn't been verified recently
  const [checking, setChecking] = useState<boolean>(() => {
    const key = getCurrentKey();
    if (!key) return false;
    return !!localStorage.getItem(key) && !isRecentlyVerified(key, VERIFY_TTL_MS);
  });
  const [showPrompt, setShowPrompt] = useState<boolean>(() => {
    const key = getCurrentKey();
    return !!key && !localStorage.getItem(key);
  });
  const [inputName, setInputName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [ownerNotice, setOwnerNotice] = useState<string>(''); // set on first-time owner registration

  const inFlightRef = useRef<boolean>(false);

  // Verify the stored seller name against the server (admin-managed list)
  const verifyStoredSeller = useCallback(async () => {
    if (inFlightRef.current) return; // never run two checks at once

    const userId = getUserIdFromToken();
    if (!userId) {
      // No valid session yet — don't prompt, let auth flow handle redirect
      setChecking(false);
      return;
    }

    const today = getTodayDate();
    const key = getSellerKey(userId, today);
    const storedName = localStorage.getItem(key);

    if (!storedName) {
      // First time today: ask once
      setSellerName('');
      setShowPrompt(true);
      setChecking(false);
      return;
    }

    inFlightRef.current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      let response = await fetch(`${API_BASE}/${today}`, {
        headers: authHeaders(),
        credentials: 'include',
        signal: controller.signal,
      });

      if (response.status === 404) {
        // Server has no record for today (e.g. an earlier save failed):
        // silently re-register the stored name instead of bothering the user.
        response = await fetch(API_BASE, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name: storedName, date: today }),
          credentials: 'include',
          signal: controller.signal,
        });
      }

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const officialName: string = data.name || storedName;
        localStorage.setItem(key, officialName);
        setSellerName(officialName);
        setShowPrompt(false);
        lastVerified = { key, at: Date.now() };

        if (data.firstTimeSetup) {
          setOwnerNotice(officialName);
        }
      } else if (response.status === 403) {
        // Removed/deactivated by the admin: the ONLY case that kicks someone out
        localStorage.removeItem(key);
        lastVerified = null;
        setSellerName('');
        setInputName('');
        setError('This seller name is no longer authorised. Enter a valid seller name or contact the admin.');
        setShowPrompt(true);
      } else {
        // Any other server problem (401/500...): keep working with the stored name
        setSellerName(storedName);
      }
    } catch (err) {
      // Network problem or timeout: keep working with the stored name
      console.error('Seller verification failed:', err);
      setSellerName(storedName);
    } finally {
      window.clearTimeout(timeout);
      inFlightRef.current = false;
      setChecking(false);
    }
  }, []);

  // Verify on mount, unless this seller was verified recently (route changes remount this provider)
  useEffect(() => {
    const key = getCurrentKey();
    if (key && isRecentlyVerified(key, VERIFY_TTL_MS)) {
      setChecking(false);
      return;
    }
    verifyStoredSeller();
  }, [verifyStoredSeller]);

  // Silent background re-checks so removals take effect mid-day (throttled)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const key = getCurrentKey();
      if (key && isRecentlyVerified(key, FOCUS_MIN_GAP_MS)) return;
      verifyStoredSeller();
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(verifyStoredSeller, RECHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [verifyStoredSeller]); 
useEffect(() => {
  console.log('SellerNameProvider mounted');
  return () => console.log('SellerNameProvider unmounted');
}, []);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = inputName.trim();
    if (!trimmedName) {
      setError('Seller name is required for the day.');
      return;
    }

    const userId = getUserIdFromToken();
    if (!userId) {
      setError('Session not found. Please log in again.');
      return;
    }

    const today = getTodayDate();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: trimmedName, date: today }),
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 403) {
          setError(data.error || 'Seller name not recognised. Ask the admin to add you.');
        } else {
          setError(data.error || `Server error: ${response.status}`);
        }
        return; // do NOT proceed to the dashboard
      }

      // Use the official name stored in the system (not what was typed)
      const officialName: string = data.name || trimmedName;
      const key = getSellerKey(userId, today);
      localStorage.setItem(key, officialName);
      lastVerified = { key, at: Date.now() }; // just verified by the server
      setSellerName(officialName);
      setShowPrompt(false);
      setChecking(false);

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

  // Still verifying after a fresh page load: show nothing rather than a popup
  if (checking) {
    return null;
  }

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
            in each day. It cannot be removed, and it is the only way to access your account as the
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
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <h2>Sellers Name </h2>
          <p>This name will be displayed on receipts, quotations, and invoices for the day.</p>
          <p className={styles.notice}>
            Enter the seller name exactly as registered by the admin. If this is your first time
            opening this account, the name you enter becomes the owner name.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Seller Name"
              className={styles.input}
              disabled={submitting}
              autoFocus
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
    <SellerContext.Provider value={{ sellerName }}>
      {children}
    </SellerContext.Provider>
  );
};

export default SellerNameProvider;