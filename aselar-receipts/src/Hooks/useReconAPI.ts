// hooks/useReconApi.ts
import axios from 'axios';
import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api'; // Adjust to your backend
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true // Auto-sends cookies for protect
});

// Types unchanged
export interface LedgerEntry {
  id: string;
  description: string;
  amount: number;
  date: Date;
  reconciledAt?: Date | null;
  bankMatchId?: string | null;
  matchStatus?: 'pending' | 'matched' | 'exception' | 'outstanding';
  reconNotes?: string | null;
  ledgerId: string;
  entryIndex: number;
  side: 'debit' | 'credit';
  title: string;
}

export interface BankTxn {
  id: string;
  txnDate: Date;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference?: string;
  matchStatus: 'pending' | 'matched' | 'manual' | 'exception';
}

export interface Statement {
  id: string;
  bankAccountTitle: string;
  statementDate: Date;
  startBalance: number;
  endBalance: number;
  status: 'imported' | 'reconciled' | 'locked';
}

export interface ReconReport {
  totalReconciled: number;
  totalEntries: number;
  variance: number;
}

// Hook for import (no userId)
export const useImportStatement = () => {
  const [loading, setLoading] = useState(false);
  const importStatement = async (formData: FormData, bankTitle: string) => {
    setLoading(true);
    try {
      const data = new FormData();
      data.append('csvFile', formData.get('csvFile') as File);
      data.append('bankTitle', bankTitle);
      // No userId—backend uses req.user._id
      const res = await api.post<Statement>('/import-statement', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  return { importStatement, loading };
};

// Hook for unreconciled (no userId)
export const useGetUnreconciled = () => {
  const [loading, setLoading] = useState(false);
  const getUnreconciled = async (bankTitle: string, startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const params = { bankTitle, startDate, endDate };
      const res = await api.get<LedgerEntry[]>('/unreconciled', { params });
      return res.data;
    } catch (error) {
      console.error('Fetch unreconciled failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  return { getUnreconciled, loading };
};

// Hook for bank txns (unchanged, no userId)
export const useGetBankTxns = (statementId: string) => {
  const [loading, setLoading] = useState(false);
  const [txns, setTxns] = useState<BankTxn[]>([]);
  useEffect(() => {
    if (!statementId) {
      setTxns([]);
      return;
    }
    setLoading(true);
    api.get<BankTxn[]>(`/bank-txns/${statementId}`)
      .then(res => setTxns(res.data))
      .catch(error => {
        console.error('Fetch bank txns failed:', error);
        setTxns([]);
      })
      .finally(() => setLoading(false));
  }, [statementId]);
  return { txns, loading };
};

// Auto-match (no userId)
export const useAutoMatch = () => {
  const [loading, setLoading] = useState(false);
  const autoMatch = async (body: { statementId: string; bankTitle: string; startDate: string; endDate: string }) => {
    setLoading(true);
    try {
      const res = await api.post<{ matched: number; totalAttempted: number; pending: number }>('/auto-match', body);
      return res.data;
    } catch (error) {
      console.error('Auto-match failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  return { autoMatch, loading };
};

// Manual match (unchanged)
export const useManualMatch = () => {
  const manualMatch = async (body: { ledgerId: string; entryIndex: number; side: 'debit' | 'credit'; bankTxnId: string; notes?: string }) => {
    try {
      await api.post('/manual-match', body);
      return { success: true };
    } catch (error) {
      console.error('Manual match failed:', error);
      throw error;
    }
  };
  return { manualMatch };
};

// Finalize (unchanged)
export const useFinalizeRecon = () => {
  const [loading, setLoading] = useState(false);
  const finalizeRecon = async (statementId: string) => {
    setLoading(true);
    try {
      const res = await api.post<{ report: ReconReport; message: string }>('/finalize-recon', { statementId });
      return res.data;
    } catch (error) {
      console.error('Finalize failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  return { finalizeRecon, loading };
};