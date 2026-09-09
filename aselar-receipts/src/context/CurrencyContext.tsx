// src/context/CurrencyContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { DEFAULT_CURRENCY } from '../utility/currencies';

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}