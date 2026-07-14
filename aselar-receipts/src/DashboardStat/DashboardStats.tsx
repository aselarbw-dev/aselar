import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { FileText, Receipt, BookOpen, CreditCard, BadgeCheck, Ban } from 'lucide-react';
import styles from './DashboardStats.module.css';

interface Stats {
  quotes: number;
  invoices: number;
  receipts: number;
  ledgers: number;
  payslips: number;
  debts: number;
}

const cards: {
  key: keyof Stats;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  to: string;
  cta: string;
}[] = [
  { key: 'quotes',   label: 'Total Quotes',    icon: <FileText size={22} />,   colorClass: 'quotes',   to: '/quote',          cta: 'Create quote'    },
  { key: 'invoices', label: 'Total Invoices',   icon: <Receipt size={22} />,    colorClass: 'invoices', to: '/invoice',        cta: 'Create invoice'  },
  { key: 'receipts', label: 'Total Receipts',   icon: <CreditCard size={22} />, colorClass: 'receipts', to: '/quick-receipt',  cta: 'Create receipt'  },
  { key: 'ledgers',  label: 'Total Ledgers',    icon: <BookOpen size={22} />,   colorClass: 'ledgers',  to: '/ledger',         cta: 'Create ledger'   },
  { key: 'payslips', label: 'Total Pay Slips',  icon: <BadgeCheck size={22} />, colorClass: 'payslips', to: '/create-passcode',cta: 'Create payslip'  },
  { key: 'debts',    label: 'Total Debt Notes', icon: <Ban size={22} />,        colorClass: 'debts',    to: '/create-passcode',cta: 'Create debt note'},
];

const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    quotes: 0, invoices: 0, receipts: 0, ledgers: 0, payslips: 0, debts: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      setLoading(true);

      const results = await Promise.allSettled([
        axios.get(`${import.meta.env.VITE_QUOTE_BACKEND_SERVICE_URL}api/get-all-quotes`,   { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5004/api/get-invoices',                                 { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_RECEIPT_BACKEND_SERVICE_URL}api/all-receipts`,   { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5006/api/all-ledgers',                                  { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5002/api/all-pays',                                     { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5012/api/debts',                                        { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [quotesRes, invoicesRes, receiptsRes, ledgersRes, payslipsRes, debtsRes] =
        results.map(r => (r.status === 'fulfilled' ? r.value : { data: { length: 0 } }));

      setStats({
        quotes:   quotesRes.data?.length   || 0,
        invoices: invoicesRes.data?.length || 0,
        receipts: receiptsRes.data?.length || 0,
        ledgers:  ledgersRes.data?.length  || 0,
        payslips: payslipsRes.data?.length || 0,
        debts:    debtsRes.data?.length    || debtsRes.data?.data?.length || 0,
      });

      const failures = results.filter(
        r => r.status === 'rejected' && r.reason?.response?.status !== 404
      );
      if (failures.length > 0) {
        toast.warning("Some stats couldn't load — others are good. Refresh to retry.");
      }
    } catch (error: any) {
      console.error('Full dashboard stats fetch error:', error);
      setStats({ quotes: 0, invoices: 0, receipts: 0, ledgers: 0, payslips: 0, debts: 0 });
      toast.error('Dashboard stats failed — check your connection and refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardStats();
    toast.info('Stats refreshed!');
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#0D6EFD" />
        <p>Loading dashboard stats...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardStats}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          {/*<span className={styles.eyebrow}>Overview</span>
          <h1 className={styles.title}>Dashboard Stats</h1> */}
          
        </div>
        <button className={styles.refreshButton} onClick={handleRefresh}>
          ↺ Refresh Stats
        </button>
      </div>

      <div className={styles.statsGrid}>
        {cards.map(({ key, label, icon, colorClass, to, cta }) => (
          <div key={key} className={`${styles.statCard} ${styles[colorClass]}`}>
            <div className={styles.cardAccent} />
            <div className={styles.iconWrap}>{icon}</div>
            <p className={styles.statLabel}>{label}</p>
            <p className={styles.statNumber}>{stats[key]}</p>
            <Link to={to} className={styles.viewLink}>+ {cta}</Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardStats;