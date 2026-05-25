// SellerNameProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import styles from './SellerNameProvider.module.css'; // Assuming you have a CSS module for styling

const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().slice(0, 10); // YYYY-MM-DD format
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
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [sellerName, setSellerName] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const today = getTodayDate();
    const storedName = localStorage.getItem(`sellerName_${today}`);
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
    const today = getTodayDate();

    // LocalStorage save (unchanged)
    localStorage.setItem(`sellerName_${today}`, trimmedName);
    setSellerName(trimmedName);
    setShowPrompt(false);
    setError('');

    // Submit to server
    try {
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/seller`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, date: today }),
        credentials: 'include', // Include cookies/auth if needed
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      // Optional: Handle response if needed (e.g., const data = await response.json();)
      console.log('Seller saved to server');
    } catch (err) {
      // Don't block UI—localStorage is primary; server is secondary
      console.error('Server save failed:', err);
      // Optional: Set a non-blocking warning state/toast here
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