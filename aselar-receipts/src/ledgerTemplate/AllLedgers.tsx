import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './AllLedgers.module.css';

// Type declarations
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

interface Transaction {
  description: string;
  amount: number;
  date: string;
}

interface Ledger {
  _id: string;
  title: string;
  createdAt: string;
  debitEntries: Transaction[];
  creditEntries: Transaction[];
}

const AllLedgers: React.FC = () => {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [expandedLedgerId, setExpandedLedgerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllLedgers = async () => {
      try {
        const response = await fetch('http://localhost:5006/api/all-ledgers',{
          credentials:"include"
        });
        const data = await response.json();
        setLedgers(data);
      } catch (error) {
        console.error('Error loading ledgers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllLedgers();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedLedgerId(expandedLedgerId === id ? null : id);
  };

  const exportLedgerToPDF = (ledger: Ledger) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(ledger.title, 14, 20);
    
    // Date
    doc.setFontSize(10);
    doc.text(`Created: ${new Date(ledger.createdAt).toLocaleString()}`, 14, 28);
    
    // Debit Table
    doc.setFontSize(14);
    doc.text('Debit Entries', 14, 40);
    autoTable(doc, {
      startY: 45,
      head: [['Description', 'Amount', 'Date']],
      body: ledger.debitEntries.map(entry => [
        entry.description,
        `BWP ${entry.amount.toLocaleString()}`,
        new Date(entry.date).toLocaleDateString()
      ]),
      styles: { fontSize: 10 }
    });
    
    // Credit Table
    doc.setFontSize(14);
    const finalY = doc.lastAutoTable?.finalY || 45;
    doc.text('Credit Entries', 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Description', 'Amount', 'Date']],
      body: ledger.creditEntries.map(entry => [
        entry.description,
        `BWP ${entry.amount.toLocaleString()}`,
        new Date(entry.date).toLocaleDateString()
      ]),
      styles: { fontSize: 10 }
    });
    
    // Balance
    const balanceY = doc.lastAutoTable?.finalY || finalY + 20;
    const totalDebits = ledger.debitEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalCredits = ledger.creditEntries.reduce((sum, e) => sum + e.amount, 0);
    const balance = Math.abs(totalDebits - totalCredits);
    const balanceType = totalDebits > totalCredits ? 'Debit' : 'Credit';
    
    doc.setFontSize(12);
    doc.text(
      `Balance: BWP ${balance.toLocaleString()} (${balanceType} side)`,
      14,
      balanceY + 10
    );
    
    doc.save(`${ledger.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportLedgerToCSV = (ledger: Ledger) => {
    const csvRows = [];
    csvRows.push(`"${ledger.title}",Created: ${new Date(ledger.createdAt).toLocaleString()}`);
    csvRows.push('Type,Description,Amount,Date');
    ledger.debitEntries.forEach(entry => {
      csvRows.push(`Debit,"${entry.description}",${entry.amount},"${new Date(entry.date).toLocaleDateString()}"`);
    });
    ledger.creditEntries.forEach(entry => {
      csvRows.push(`Credit,"${entry.description}",${entry.amount},"${new Date(entry.date).toLocaleDateString()}"`);
    });
    const totalDebits = ledger.debitEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalCredits = ledger.creditEntries.reduce((sum, e) => sum + e.amount, 0);
    const balance = Math.abs(totalDebits - totalCredits);
    const balanceType = totalDebits > totalCredits ? 'Debit' : 'Credit';
    csvRows.push(`Balance,,${balance},${balanceType}`);
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${ledger.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  if (loading) return <div className={styles.loading}>Loading ledgers...</div>;
  if (ledgers.length === 0) return <div className={styles.empty}>No ledgers found</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>All Ledgers</h1>
      <div className={styles.ledgerList}>
        {ledgers.map(ledger => (
          <div key={ledger._id} className={styles.ledgerCard}>
            <div className={styles.ledgerHeader} onClick={() => toggleExpand(ledger._id)}>
              <h3>{ledger.title}</h3>
              <span className={styles.date}>
                {new Date(ledger.createdAt).toLocaleDateString()}
              </span>
              <span className={styles.toggle}>
                {expandedLedgerId === ledger._id ? '▲' : '▼'}
              </span>
            </div>
            {expandedLedgerId === ledger._id && (
              <div className={styles.ledgerDetails}>
                <div className={styles.entriesSection}>
                  <div className={styles.entriesColumn}>
                    <h4>Debit Entries</h4>
                    {ledger.debitEntries.length > 0 ? (
                      <ul className={styles.entriesList}>
                        {ledger.debitEntries.map((entry, index) => (
                          <li key={index} className={styles.entry}>
                            <span className={styles.entryDesc}>{entry.description}</span>
                            <span className={styles.entryAmount}>BWP {entry.amount.toLocaleString()}</span>
                            <span className={styles.entryDate}>{new Date(entry.date).toLocaleDateString()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.noEntries}>No debit entries</p>
                    )}
                  </div>
                  <div className={styles.entriesColumn}>
                    <h4>Credit Entries</h4>
                    {ledger.creditEntries.length > 0 ? (
                      <ul className={styles.entriesList}>
                        {ledger.creditEntries.map((entry, index) => (
                          <li key={index} className={styles.entry}>
                            <span className={styles.entryDesc}>{entry.description}</span>
                            <span className={styles.entryAmount}>BWP {entry.amount.toLocaleString()}</span>
                            <span className={styles.entryDate}>{new Date(entry.date).toLocaleDateString()}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.noEntries}>No credit entries</p>
                    )}
                  </div>
                </div>
                <div className={styles.ledgerSummary}>
                  <div className={styles.total}>
                    <span>Total Debits:</span>
                    <strong>BWP {ledger.debitEntries.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</strong>
                  </div>
                  <div className={styles.total}>
                    <span>Total Credits:</span>
                    <strong>BWP {ledger.creditEntries.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</strong>
                  </div>
                  <div className={styles.balance}>
                    <span>Balance:</span>
                    <strong>
                      BWP {Math.abs(
                        ledger.debitEntries.reduce((sum, e) => sum + e.amount, 0) - 
                        ledger.creditEntries.reduce((sum, e) => sum + e.amount, 0)
                      ).toLocaleString()}
                      ({ledger.debitEntries.reduce((sum, e) => sum + e.amount, 0) > 
                       ledger.creditEntries.reduce((sum, e) => sum + e.amount, 0) ? 'Debit' : 'Credit'})
                    </strong>
                  </div>
                </div>
                <div className={styles.exportButtons}>
                  <button onClick={() => exportLedgerToPDF(ledger)} className={styles.pdfButton}>
                    Export PDF
                  </button>
                  <button onClick={() => exportLedgerToCSV(ledger)} className={styles.csvButton}>
                    Export CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllLedgers;