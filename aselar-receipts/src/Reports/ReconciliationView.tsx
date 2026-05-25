// ReconciliationView.tsx (Updated with built-in param selector for easier testing)
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; // Import for query params
import styles from './ReconciliationView.module.css';
import axios from 'axios';

interface BusinessEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  side: 'debit' | 'credit';
  ledgerId: string;
}

interface BankTxn {
  _id: string;
  txnDate: string;
  description: string;
  debit: number;
  credit: number;
  matchStatus: string;
  statementId?: string;
}

interface Statement {
  startBalance: number;
  endBalance: number;
  bankAccountTitle: string;
}

interface ReconData {
  businessEntries: BusinessEntry[];
  bankTxns: BankTxn[];
  statement?: Statement;
  period: { startDate: string; endDate: string };
}

const ReconciliationView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams(); // Now mutable for updates
  const [data, setData] = useState<ReconData | null>(null);
  const [loading, setLoading] = useState(true);
  const [potentialMatches, setPotentialMatches] = useState<Map<string, BankTxn>>(new Map());
  const [showSelector, setShowSelector] = useState(false); // Toggle for param input if missing

  // Extract params from URL query (e.g., /recon?bankTitle=BankXYZ&startDate=2025-01-01&endDate=2025-01-31&statementId=abc)
  const bankTitleFromUrl = searchParams.get('bankTitle') || '';
  const startDateFromUrl = searchParams.get('startDate') || new Date().toISOString().split('T')[0]; // Default today
  const endDateFromUrl = searchParams.get('endDate') || new Date().toISOString().split('T')[0]; // Default today
  const statementIdFromUrl = searchParams.get('statementId') || undefined;

  // Local state for inputs (sync with URL on change)
  const [bankTitle, setBankTitle] = useState(bankTitleFromUrl);
  const [startDate, setStartDate] = useState(startDateFromUrl);
  const [endDate, setEndDate] = useState(endDateFromUrl);
  const [statementId, setStatementId] = useState(statementIdFromUrl || '');

  // Update URL params when local state changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (bankTitle) newParams.set('bankTitle', bankTitle);
    else newParams.delete('bankTitle');
    newParams.set('startDate', startDate);
    newParams.set('endDate', endDate);
    if (statementId) newParams.set('statementId', statementId);
    else newParams.delete('statementId');
    setSearchParams(newParams);
  }, [bankTitle, startDate, endDate, statementId, setSearchParams, searchParams]);

  // Show selector if no bankTitle
  useEffect(() => {
    if (!bankTitleFromUrl) {
      setShowSelector(true);
    }
  }, [bankTitleFromUrl]);

  useEffect(() => {
    const fetchData = async () => {
      if (!bankTitle) {
        setLoading(false);
        return; // Skip fetch if no bankTitle
      }
      try {
        const params = { bankTitle, startDate, endDate, ...(statementId && { statementId }) };
        const response = await axios.get('http://localhost:5006/api/recon-data', { params });
        setData(response.data);

        // Client-side potential matches (for display; server auto-match runs on button)
        const matches = new Map<string, BankTxn>();
        response.data.businessEntries.forEach((entry: BusinessEntry) => {
          const potential = response.data.bankTxns.find((t: BankTxn) => 
            (entry.side === 'debit' && t.credit === entry.amount) || (entry.side === 'credit' && t.debit === entry.amount)
          );
          if (potential) matches.set(entry.id, potential);
        });
        setPotentialMatches(matches);
      } catch (error) {
        console.error('Error fetching recon data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [bankTitle, startDate, endDate, statementId]);

  const handleAutoMatch = async () => {
    if (!data || !bankTitle) return;
    await axios.post('http://localhost:5006/api/auto-match', {
      statementId,
      bankTitle,
      startDate,
      endDate,
    });
    // Refetch data
    window.location.reload(); // Simple refresh; use state update in prod
  };

  const handleManualMatch = async (businessId: string, bankId: string) => {
    const entry = data!.businessEntries.find((e: BusinessEntry) => e.id === businessId);
    if (!entry) return;
    await axios.post('http://localhost:5006/api/manual-match', {
      ledgerId: entry.ledgerId,
      entryIndex: 0, // Assume single-entry ledgers; adjust if multi
      side: entry.side,
      bankTxnId: bankId,
    });
    // Refetch
    window.location.reload();
  };

  const calculateTotals = () => {
    if (!data) return { totalBusinessDebits: 0, totalBusinessCredits: 0, totalBankDebits: 0, totalBankCredits: 0, balance: 0 };
    const businessDebits = data.businessEntries
      .filter((e: BusinessEntry) => e.side === 'debit')
      .reduce((sum: number, e: BusinessEntry) => sum + e.amount, 0);
    const businessCredits = data.businessEntries
      .filter((e: BusinessEntry) => e.side === 'credit')
      .reduce((sum: number, e: BusinessEntry) => sum + e.amount, 0);
    const bankDebits = data.bankTxns.reduce((sum: number, t: BankTxn) => sum + t.debit, 0);
    const bankCredits = data.bankTxns.reduce((sum: number, t: BankTxn) => sum + t.credit, 0);
    const balance = (data.statement?.endBalance || 0) + businessDebits - businessCredits; // Approx variance
    return { totalBusinessDebits: businessDebits, totalBusinessCredits: businessCredits, totalBankDebits: bankDebits, totalBankCredits: bankCredits, balance };
  };

  const totals = calculateTotals();

  if (loading) return <div className={styles.loading}>Loading reconciliation...</div>;

  if (showSelector) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2>Bank Reconciliation Setup</h2>
          <div className={styles.selectorForm}>
            <label>
              Bank Title: <input type="text" value={bankTitle} onChange={(e) => setBankTitle(e.target.value)} placeholder="e.g., Bank XYZ" />
            </label>
            <label>
              Start Date: <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              End Date: <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label>
              Statement ID (optional): <input type="text" value={statementId} onChange={(e) => setStatementId(e.target.value)} placeholder="Leave blank if none" />
            </label>
            <button onClick={() => setShowSelector(false)} disabled={!bankTitle}>Load Reconciliation</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Bank Reconciliation - {bankTitle}</h2>
          <button className={styles.saveBtn} onClick={() => setShowSelector(true)}>Edit Params</button>
        </div>
        <div className={styles.totalsRow}>
          <div className={styles.totals}>
            <div>Total Business Debits: {totals.totalBusinessDebits.toFixed(2)}</div>
            <div>Total Business Credits: {totals.totalBusinessCredits.toFixed(2)}</div>
          </div>
          <div className={styles.totals}>
            <div>Total Bank Debits: {totals.totalBankDebits.toFixed(2)}</div>
            <div>Total Bank Credits: {totals.totalBankCredits.toFixed(2)}</div>
          </div>
        </div>
        <div className={styles.balanceRow}>
          Balance B/F: {totals.balance.toFixed(2)} on the {(totals.balance > 0 ? 'Debit' : 'Credit')} side
        </div>
        <div className={styles.entriesRow}>
          <div className={styles.businessColumn}>
            <h3>Business Entries</h3>
            {data?.businessEntries.map((entry: BusinessEntry) => (
              <div key={entry.id} className={`${styles.entry} ${potentialMatches.has(entry.id) ? styles.potentialMatch : ''}`}>
                <span className={styles.desc}>{entry.description || 'N/A'}</span>
                <span className={styles.amount}>{entry.side === 'debit' ? `+${entry.amount.toFixed(2)}` : `-${entry.amount.toFixed(2)}`}</span>
                <div className={styles.buttons}>
                  {potentialMatches.has(entry.id) && (
                    <button 
                      className={styles.matchBtn} 
                      onClick={() => handleManualMatch(entry.id, potentialMatches.get(entry.id)!._id)}
                    >
                      Match
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.bankColumn}>
            <h3>Bank Transactions</h3>
            {data?.bankTxns.map((txn: BankTxn) => (
              <div key={txn._id} className={`${styles.entry} ${potentialMatches.has(txn._id) ? styles.potentialMatch : ''}`}>
                <span className={styles.desc}>{txn.description || 'N/A'}</span>
                <span className={styles.amount}>{txn.credit > 0 ? `+${txn.credit.toFixed(2)}` : `-${txn.debit.toFixed(2)}`}</span>
                <div className={styles.buttons}>
                  {/* Match button would target business entry; simplified here */}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.autoMatchBtn} onClick={handleAutoMatch}>Auto-Match All</button>
          <button className={styles.postBtn}>Post & Finalize</button>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationView;