// components/AgingReport.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Or your HTTP client
import styles from './AgingReport.module.css'; // Import the CSS module – ensures styles object is available

interface Invoice {
  _id: string;
  customerName: string;
  totalSum: string; // Original formatted String
  parsedAmount: number; // Backend-parsed for calcs
  receiverCompany?: string;
  receiverPhone?: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  bucket: string;
  isOutstanding: boolean;
  invoiceNumber?: string;
}

interface CustomerReport {
  customerName: string;
  totalOutstanding: number;
  buckets: Record<string, number>;
  invoices: Invoice[];
}

interface AgingReport {
  report: CustomerReport[];
  summary: {
    grandTotal: number;
    bucketTotals: Record<string, number>;
  };
  currentDate: string;
}

const AgingReport: React.FC = () => {
  const [data, setData] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
  try {
    const res = await axios.get('http://localhost:5004/api/aging-report', { withCredentials: true });
    setData(res.data);
  } catch (err) {
    setError('Failed to load report');
  } finally {
    setLoading(false);
  }
};

  const handleMarkPaid = async (invoiceId: string) => {
  try {
    await axios.patch(`http://localhost:5004/api/invoices/${invoiceId}/pay`, {}, { withCredentials: true });
    fetchReport(); // Refresh
  } catch (err) {
    alert('Failed to mark as paid');
  }
};

  if (loading) return <div className={styles.container}>Loading...</div>;
  if (error) return <div className={styles.container}>Error: {error}</div>;

  if (!data) return null;

  return (
    <div className={styles.container}>
      <h2 className={styles.reportTitle}>
        Accounts Receivable Aging Report ({data.currentDate})
      </h2>
      <p className={styles.purpose}>
        <strong>Purpose:</strong> Track overdue payments, estimate bad debts, and prioritize collections.
      </p>

      {/* Summary Table */}
      <h3 className={styles.sectionTitle}>Summary by Aging Bucket</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Age Bucket</th>
            <th>Amount Outstanding</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.summary.bucketTotals).map(([bucket, amount]) => (
            <tr key={bucket}>
              <td>{bucket}</td>
              <td>Bwp {amount.toFixed(2)}</td>
              <td>{((amount / data.summary.grandTotal) * 100).toFixed(1)}%</td>
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <td>Total</td>
            <td>Bwp {data.summary.grandTotal.toFixed(2)}</td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>

      {/* Detailed Table per Customer */}
      <h3 className={styles.sectionTitle}>Detailed by Customer (Unpaid Invoices Only)</h3>
      {data.report.map((customer) => (
        <div key={customer.customerName}>
          <h4 className={styles.customerHeader}>
            {customer.customerName} - Total Outstanding: Bwp {customer.totalOutstanding.toFixed(2)}
          </h4>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice #</th>
         
                <th>Invoice Amount</th>
                <th>Aging Bucket</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customer.invoices.map((inv) => (
                <tr
                  key={inv._id}
                  className={inv.isOutstanding ? styles.outstandingRow : ''}
                >
                  <td>{inv.invoiceNumber || 'N/A'}</td>
               
                  <td>Bwp {inv.parsedAmount.toFixed(2)}</td>
                  <td>{inv.bucket}</td>
                  <td>
                    {inv.status}
                    {inv.isOutstanding && (
                      <span className={styles.alert}>
                        ⚠️ Alert: Call customer ASAP (Overdue &gt;30 days)
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleMarkPaid(inv._id)}
                    >
                      Mark as Paid
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default AgingReport;