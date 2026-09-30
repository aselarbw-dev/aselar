// SellerNameProvider.tsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import styles from './SellerNameProvider.module.css';

const API_BASE = `${import.meta.env.VITE_AUTH_SERVICE_URL}api/seller`;
const RECHECK_INTERVAL_MS = 5 * 60 * 1000; // re-verify every 5 minutes

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

interface SellerContextType {
  sellerName: string;
}

const SellerContext = createContext<SellerContextType>({ sellerName: '' });

export const useSellerContext = () => useContext(SellerContext);

interface SellerNameProviderProps {
  children: React.ReactNode;
}

const SellerNameProvider: React.FC<SellerNameProviderProps> = ({ children }) => {
  const [checking, setChecking] = useState<boolean>(true);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [sellerName, setSellerName] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [ownerNotice, setOwnerNotice] = useState<string>(''); // set on first-time owner registration

  // Verify the stored seller name against the server (admin-managed list)
  const verifyStoredSeller = useCallback(async () => {
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
      setSellerName('');
      setShowPrompt(true);
      setChecking(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${today}`, {
        headers: authHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const officialName = data.name || storedName;
        localStorage.setItem(key, officialName);
        setSellerName(officialName);
        setShowPrompt(false);
      } else if (response.status === 403 || response.status === 404) {
        // Removed/deactivated by admin (403) or no record for today (404)
        localStorage.removeItem(key);
        setSellerName('');
        setInputName('');
        setError(
          response.status === 403
            ? 'This seller name is no longer authorised. Enter a valid seller name or contact the admin.'
            : ''
        );
        setShowPrompt(true);
      } else {
        // Other server problem (e.g. 401/500): keep the stored name, don't lock the shop
        setSellerName(storedName);
      }
    } catch (err) {
      // Network problem: keep working with the stored name
      console.error('Seller verification failed:', err);
      setSellerName(storedName);
    } finally {
      setChecking(false);
    }
  }, []);

  // Verify on load
  useEffect(() => {
    verifyStoredSeller();
  }, [verifyStoredSeller]);

  // Re-verify when the tab regains focus and on a timer, so removals take effect mid-day
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') verifyStoredSeller();
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(verifyStoredSeller, RECHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [verifyStoredSeller]);

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
      localStorage.setItem(getSellerKey(userId, today), officialName);
      setSellerName(officialName);
      setShowPrompt(false);

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

  // Still verifying — don't show the dashboard yet
  if (checking) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <p className={styles.loading}>Verifying seller...</p>
        </div>
      </div>
    );
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