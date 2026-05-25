import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import styles from './DashboardStats.module.css'; // Updated CSS module for DashboardStats

interface Stats {
  quotes: number;
  invoices: number;
  receipts: number;
  ledgers: number;
  payslips: number;
  debts: number;
}

const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ quotes: 0, invoices: 0, receipts: 0, ledgers: 0, payslips: 0, debts: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // ← CHANGED: allSettled for partial wins
      const results = await Promise.allSettled([
        axios.get('http://localhost:5003/api/get-all-quotes', { withCredentials: true }),
        axios.get('http://localhost:5004/api/get-invoices', { withCredentials: true }),
        axios.get('http://localhost:5005/api/all-receipts', { withCredentials: true }),
        axios.get('http://localhost:5006/api/all-ledgers', { withCredentials: true }),
        axios.get('http://localhost:5002/api/all-pays', { withCredentials: true }),
        axios.get('http://localhost:5012/api/debts', { withCredentials: true })
      ]);
  
      // ← NEW: Process each result individually
      const [quotesRes, invoicesRes, receiptsRes, ledgersRes, payslipsRes, debtsRes] = results.map(r => r.status === 'fulfilled' ? r.value : { data: { length: 0 } });
  
      setStats({
        quotes: quotesRes.data?.length || 0,
        invoices: invoicesRes.data?.length || 0,
        receipts: receiptsRes.data?.length || 0,
        ledgers: ledgersRes.data?.length || 0,
        payslips: payslipsRes.data?.length || 0,
        debts: debtsRes.data?.length || 0,  // Or debtsRes.data?.data?.length if still wrapped
      });
  
      // ← OPTIONAL: Toast only for failures (non-404)
      const failures = results.filter(r => r.status === 'rejected' && r.reason?.response?.status !== 404);
      if (failures.length > 0) {
        toast.warning(`Some stats couldn't load (e.g., debts)—others are good. Refresh to retry.`);
      }
    } catch (error: any) {
      // ← SAFER: Fallback only if *everything* bombs (rare)
      console.error('Full dashboard stats fetch error:', error);
      setStats({ quotes: 0, invoices: 0, receipts: 0, ledgers: 0, payslips: 0, debts: 0 });
      toast.error('Dashboard stats failed—check your connection and refresh.');
    } finally {
      setLoading(false);
    }
  };
  // Refresh button handler (optional: add to UI if you want manual refresh)
  const handleRefresh = () => {
    fetchDashboardStats();
    toast.info('Stats refreshed!');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#6366f1" />
        <p>Loading dashboard stats...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardStats}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard Stats Overview</h1>
        <button className={styles.refreshButton} onClick={handleRefresh}>
          Refresh Stats
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Total Quotes</h3>
          <p className={styles.statNumber}>{stats.quotes}</p>
          <Link to="/quote" className={styles.viewLink}>Create a  quote</Link>
        </div>

        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Total Invoices</h3>
          <p className={styles.statNumber}>{stats.invoices}</p>
          <Link to="/invoice" className={styles.viewLink}>Create invoice</Link>
        </div>

        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Total Receipts</h3>
          <p className={styles.statNumber}>{stats.receipts}</p>
          <Link to="/quick-receipt" className={styles.viewLink}>Create rceipt</Link>
        </div>

        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Total Ledgers</h3>
          <p className={styles.statNumber}>{stats.ledgers}</p>
          <Link to="/ledger" className={styles.viewLink}>Create ledgers</Link>
        </div>

        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Total Pay Slips</h3>
          <p className={styles.statNumber}>{stats.payslips}</p>
          <Link to="/create-passcode" className={styles.viewLink}>Create payslip</Link>
        </div>

        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Total Debt Notes</h3>
          <p className={styles.statNumber}>{stats.debts}</p>
          <Link to="/create-passcode" className={styles.viewLink}>Create debtnote</Link>
        </div>
      </div>

      {/* Optional: Add a quick actions row or charts here if you want 
      
      <div className={styles.actionsRow}>
        <Link to="/quick-quote">
          <button className={styles.actionButton}>New Quote</button>
        </Link>
        <Link to="/quick-invoice">
          <button className={styles.actionButton}>New Invoice</button>
        </Link>
        <Link to="/quick-category-receipt">
          <button className={styles.actionButton}>New Receipt</button>
        </Link>
      </div>
      */}
      
    </div>
  );
};

export default DashboardStats;