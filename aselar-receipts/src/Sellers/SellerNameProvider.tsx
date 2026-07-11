// SellerNameProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import styles from './SellerNameProvider.module.css';

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

interface SellerContextType {
  sellerName: string;
}

const SellerContext = createContext<SellerContextType>({ sellerName: '' });

export const useSellerContext = () => useContext(SellerContext);

interface SellerNameProviderProps {
  children: React.ReactNode;
}

const SellerNameProvider: React.FC<SellerNameProviderProps> = ({ children }) => {
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [sellerName, setSellerName] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const userId = getUserIdFromToken();
    if (!userId) {
      // No valid session yet — don't prompt, let auth flow handle redirect
      return;
    }

    const today = getTodayDate();
    const storedName = localStorage.getItem(getSellerKey(userId, today));
    if (storedName) {
      setSellerName(storedName);
    } else {
      setShowPrompt(true);
    }
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

    // LocalStorage save — now scoped per user, not just per date
    localStorage.setItem(getSellerKey(userId, today), trimmedName);
    setSellerName(trimmedName);
    setShowPrompt(false);
    setError('');

    // Submit to server
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/seller`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: trimmedName, date: today }),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      console.log('Seller saved to server');
    } catch (err) {
      console.error('Server save failed:', err);
    }
  };

  if (showPrompt) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <h2>Sellers Name </h2>
          <p>This name will be displayed on receipts, quotations, and invoices for the day.</p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Seller Name"
              className={styles.input}
            />
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.submitButton}>
              Submit
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