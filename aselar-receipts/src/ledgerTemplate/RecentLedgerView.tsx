import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './RecentLedgerView.module.css';

interface Transaction {
  description: string;
  amount: number;
  date: string;
}

interface LedgerData {
  title: string;
  debitEntries: Transaction[];
  creditEntries: Transaction[];
}

const RecentLedgerView: React.FC = () => {
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentLedger = async () => {
      try {
        const response = await fetch('http://localhost:5006/api/recent-ledger',{
          credentials: 'include' // Include cookies for authentication
        });
        if (!response.ok) throw new Error('Failed to fetch ledger');
        
        const data = await response.json();
        if (!data.createdAt) data.createdAt = new Date().toISOString();
        setLedger(data);
        console.log("Fetched ledger:", {
            title: data.title,
            createdAt: data.createdAt, // Check this exists
            debitCount: data.debitEntries?.length,
            creditCount: data.creditEntries?.length
          });
          
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to load recent ledger');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentLedger();
  }, []);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!ledger) return <div className={styles.error}>No ledger data available</div>;

  // Calculate totals and balance
  const totalDebits = ledger.debitEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalCredits = ledger.creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const balance = Math.abs(totalDebits - totalCredits);
  const balanceType = totalDebits > totalCredits ? 'Debit' : 'Credit';

  return (
    <div className={styles.container}>
      {/* Printable Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>{ledger.title}</h1>
        <div className={styles.date}>
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </header>

      {/* Ledger Table */}
      <div className={styles.ledgerGrid}>
        {/* Debit Column */}
        <div className={styles.column}>
          <h2 className={styles.columnHeader}>Debit</h2>
          <div className={styles.entries}>
            {ledger.debitEntries.map((entry, index) => (
              <div key={index} className={styles.entry}>
                <span>{entry.description}</span>
                <span className={styles.amount}>
                  {entry.amount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'BWP'
                  })}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.total}>
            Total: {totalDebits.toLocaleString('en-US', {
              style: 'currency',
              currency: 'BWP'
            })}
          </div>
        </div>

        {/* Credit Column */}
        <div className={styles.column}>
          <h2 className={styles.columnHeader}>Credit</h2>
          <div className={styles.entries}>
            {ledger.creditEntries.map((entry, index) => (
              <div key={index} className={styles.entry}>
                <span>{entry.description}</span>
                <span className={styles.amount}>
                  {entry.amount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'BWP'
                  })}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.total}>
            Total: {totalCredits.toLocaleString('en-US', {
              style: 'currency',
              currency: 'BWP'
            })}
          </div>
        </div>
      </div>

      {/* Balance Display */}
      <div className={styles.balance}>
        <strong>Balance Brought Forward:</strong>
        <span>
          {balance.toLocaleString('en-US', {
            style: 'currency',
            currency: 'BWP'
          })} on {balanceType} side
        </span>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button onClick={() => window.print()} className={styles.printButton}>
          Print Ledger
        </button>
        <button className={styles.shareButton}>Share via SMS</button>
        <button className={styles.shareButton}>Share via WhatsApp</button>
      </div>
    </div>
  );
};

export default RecentLedgerView;