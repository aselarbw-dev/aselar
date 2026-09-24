import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDownload, faSearch } from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import styles from './LaybuyReceipts.module.css';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  totalPrice: number;
}

interface LaybuyDetails {
  dueDate: string;
  balanceRemaining: number;
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  reminderSentAt?: string | null;
  overdueNoticeSentAt?: string | null;
}

interface ReceiptData {
  _id: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  cashPaid: number;
  change: number;
  receiptsNumber?: string;
  createdAt?: string;
  status?: string;
  saleType?: 'full' | 'laybuy';
  laybuy?: LaybuyDetails;
}

interface BusinessData {
  _id: string;
  businessNature: string;
  place: string;
  businessNumber: string;
  businessDescription: string;
  user: string;
}

interface ProfileData {
  _id: string;
  nameOfBusiness: string;
  emailBusiness: string;
  businessPhone: string;
  profilePicture: string;
}

// how many days out from the due date a reminder starts showing (overdue always shows)
const REMINDER_WINDOW_DAYS = 3;
// shared with AllCategoryReceipts — dismissing here also dismisses it there, and vice versa
const DISMISSED_LAYBUYS_KEY = 'aselar_dismissed_laybuy_reminders';

const LaybuyReceipts: React.FC = () => {
  const [laybuys, setLaybuys] = useState<ReceiptData[]>([]);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Reminders (shared dismiss logic with AllCategoryReceipts)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Per-card installment payment state
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [submittingPaymentId, setSubmittingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_LAYBUYS_KEY);
      if (stored) {
        setDismissedIds(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.warn('Failed to read dismissed lay-buy reminders', err);
    }
  }, []);

  useEffect(() => {
    const fetchBusinessAndProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const [businessResponse, profileResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/get-business`, {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            params: { _t: Date.now() },
            withCredentials: true,
          }),
          axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/profile`, {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            params: { _t: Date.now() },
            withCredentials: true,
          })
        ]);
        setBusinessData(businessResponse.data);
        setProfileData(profileResponse.data);
      } catch (error) {
        console.error('Failed to fetch business/profile data:', error);
      }
    };
    fetchBusinessAndProfile();
  }, []);

  useEffect(() => {
    fetchLaybuys();
  }, []);

  // No status param — returns every lay-buy (active, overdue, completed, cancelled)
  // so a cashier can look up an old one, not just open ones.
  const fetchLaybuys = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/laybuys`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: { _t: Date.now() },
        withCredentials: true,
      });
      const data: ReceiptData[] = response.data.data || [];
      setLaybuys(data);
      setTotalOutstanding(response.data.totalOutstanding ?? 0);
    } catch (error: any) {
      console.error('Failed to fetch lay-buys:', error);
      if (error.response?.status === 404) {
        setLaybuys([]);
        setTotalOutstanding(0);
      } else {
        toast.error('Failed to fetch lay-buy receipts');
      }
    } finally {
      setLoading(false);
    }
  };

  const daysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const laybuyBadgeClass = (r: ReceiptData) => {
    if (!r.laybuy) return styles.laybuyBadge;
    if (r.laybuy.status === 'completed') return `${styles.laybuyBadge} ${styles.laybuyBadgePaid}`;
    if (new Date(r.laybuy.dueDate) < new Date()) return `${styles.laybuyBadge} ${styles.laybuyBadgeOverdue}`;
    return styles.laybuyBadge;
  };
  const laybuyBadgeLabel = (r: ReceiptData) => {
    if (!r.laybuy) return 'LAY-BUY';
    return r.laybuy.status === 'completed' ? 'LAY-BUY — PAID' : 'LAY-BUY';
  };

  // Filtering: receipt ID / number search + due-date range, applied client-side
  // over the already-fetched lay-buy list (same source of truth as AllCategoryReceipts)
  const filteredLaybuys = useMemo(() => {
    return laybuys.filter((r) => {
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesNumber = r.receiptsNumber?.toLowerCase().includes(term);
        const matchesId = r._id.toLowerCase().includes(term);
        if (!matchesNumber && !matchesId) return false;
      }

      if (r.laybuy?.dueDate) {
        const due = new Date(r.laybuy.dueDate);
        due.setHours(0, 0, 0, 0);

        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          if (due < from) return false;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(0, 0, 0, 0);
          if (due > to) return false;
        }
      }

      return true;
    });
  }, [laybuys, searchTerm, fromDate, toDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
  };

  const dueSoonOrOverdueLaybuys = laybuys.filter((r) => {
    if (!r.laybuy || r.laybuy.status !== 'active') return false;
    if (dismissedIds.has(r._id)) return false;
    return daysUntilDue(r.laybuy.dueDate) <= REMINDER_WINDOW_DAYS;
  });

  const dismissReminder = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(DISMISSED_LAYBUYS_KEY, JSON.stringify(Array.from(next)));
      } catch (err) {
        console.warn('Failed to persist dismissed lay-buy reminder', err);
      }
      return next;
    });
  };

  const handlePaymentAmountChange = (id: string, value: string) => {
    setPaymentAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddPayment = async (receiptId: string) => {
    const amount = Number(paymentAmounts[receiptId]);
    if (!amount || amount <= 0) {
      toast.warning('Enter a valid payment amount');
      return;
    }

    setSubmittingPaymentId(receiptId);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/laybuys/${receiptId}/pay`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );

      const data = response.data;
      if (data.success) {
        const updatedReceipt: ReceiptData = data.data;
        setLaybuys((prev) => prev.map((r) => (r._id === receiptId ? updatedReceipt : r)));
        setPaymentAmounts((prev) => ({ ...prev, [receiptId]: '' }));
        toast.success(
          updatedReceipt.laybuy?.status === 'completed'
            ? 'Lay-buy fully paid off!'
            : 'Payment recorded'
        );
        // recompute outstanding total from the freshest data
        const refreshed = laybuys.map((r) => (r._id === receiptId ? updatedReceipt : r));
        setTotalOutstanding(
          refreshed.reduce((sum, r) => sum + (r.laybuy?.balanceRemaining || 0), 0)
        );
      } else {
        toast.error(data.message || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('Add lay-buy payment error:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmittingPaymentId(null);
    }
  };

  const exportReceiptToPDF = (receipt: ReceiptData) => {
    const doc = new jsPDF();
    const companyName = profileData?.nameOfBusiness || 'TeX-Technology Extreme';
    const address1 = businessData?.place || 'Plot 1234';
    const email = profileData?.emailBusiness || 'tex@robotics.bw';

    doc.setFontSize(16);
    doc.text(companyName, 14, 20);
    doc.setFontSize(10);
    doc.text(address1, 14, 27);
    doc.text(email, 14, 33);

    doc.setFontSize(18);
    doc.text('LAY-BUY RECEIPT', 105, 50, { align: 'center' });
    if (receipt.createdAt) {
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(receipt.createdAt).toLocaleDateString()}`, 105, 58, { align: 'center' });
    }
    doc.text(`Receipt #: ${receipt.receiptsNumber || receipt._id.slice(-6)}`, 105, 65, { align: 'center' });

    let y = 80;
    doc.setFontSize(12);
    receipt.items?.forEach((item) => {
      doc.setFontSize(10);
      doc.text(`${item.name}  x${item.quantity}`, 14, y);
      doc.text(`BWP ${item.totalPrice.toFixed(2)}`, 160, y, { align: 'right' });
      y += 7;
    });

    y += 8;
    doc.setFontSize(12);
    doc.text(`Total: BWP ${receipt.total.toFixed(2)}`, 160, y, { align: 'right' }); y += 7;
    doc.text(`Amount Paid: BWP ${receipt.cashPaid.toFixed(2)}`, 160, y, { align: 'right' }); y += 7;
    if (receipt.laybuy) {
      doc.text(`Balance Remaining: BWP ${receipt.laybuy.balanceRemaining.toFixed(2)}`, 160, y, { align: 'right' }); y += 7;
      doc.text(`Due Date: ${new Date(receipt.laybuy.dueDate).toLocaleDateString()}`, 160, y, { align: 'right' }); y += 7;
      doc.text(`Status: ${receipt.laybuy.status.toUpperCase()}`, 160, y, { align: 'right' }); y += 7;
    }

    y += 15;
    doc.setFontSize(8);
    doc.text('Powered by Aselar, a TeX product.', 105, y, { align: 'center' });

    doc.save(`Laybuy_${receipt.receiptsNumber || receipt._id.slice(-8)}.pdf`);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#6366f1" />
        <p>Loading lay-buy receipts...</p>
      </div>
    );
  }

  return (
    <div className={styles.cover}>
      <div className={styles.topTitles}>
        <h2 className={styles.pageTitle}>Lay-buy Receipts</h2>
        <div className={styles.statsCards}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{laybuys.length}</span>
            <span className={styles.statLabel}>Total Lay-buys</span>
          </div>
          <div className={`${styles.statCard} ${styles.laybuyStatCard}`}>
            <span className={styles.statNumber}>BWP {totalOutstanding.toFixed(2)}</span>
            <span className={styles.statLabel}>Balance Outstanding</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by receipt ID or number"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.dateFilter}>
          <label>Due from</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={styles.dateInput} />
        </div>
        <div className={styles.dateFilter}>
          <label>Due to</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={styles.dateInput} />
        </div>
        {(searchTerm || fromDate || toDate) && (
          <button className={styles.clearFiltersButton} onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* Reminders */}
      {dueSoonOrOverdueLaybuys.length > 0 && (
        <div className={styles.reminderBanner}>
          {dueSoonOrOverdueLaybuys.map((r) => {
            const days = daysUntilDue(r.laybuy!.dueDate);
            const isOverdue = days < 0;
            return (
              <div key={r._id} className={`${styles.reminderItem} ${isOverdue ? styles.reminderOverdue : ''}`}>
                <span>
                  {isOverdue
                    ? `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}: `
                    : days === 0
                    ? 'Due today: '
                    : `Due in ${days} day${days === 1 ? '' : 's'}: `}
                  Lay-buy {r.receiptsNumber || r._id.slice(-6)} — Balance BWP {r.laybuy!.balanceRemaining.toFixed(2)}
                </span>
                <button className={styles.reminderDismiss} onClick={() => dismissReminder(r._id)} title="Dismiss reminder">
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {filteredLaybuys.length === 0 ? (
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>💸</div>
          <h3>No lay-buy receipts found</h3>
          <p>{laybuys.length === 0 ? "No lay-buy sales have been made yet." : "Try adjusting your search or date filters."}</p>
        </div>
      ) : (
        <div className={styles.receiptsGrid}>
          {filteredLaybuys.map((receipt) => {
            const isOpenLaybuy = receipt.laybuy && receipt.laybuy.status !== 'completed' && receipt.laybuy.status !== 'cancelled';
            return (
              <div key={receipt._id} className={styles.receiptCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.receiptTitleRow}>
                    <h3>Receipt {receipt.receiptsNumber || receipt._id.slice(-6)}</h3>
                    <span className={laybuyBadgeClass(receipt)}>{laybuyBadgeLabel(receipt)}</span>
                  </div>
                  {receipt.createdAt && <span className={styles.cardDate}>{new Date(receipt.createdAt).toLocaleDateString()}</span>}
                </div>

                {receipt.items && receipt.items.length > 0 && (
                  <div className={styles.itemsContainer}>
                    {receipt.items.map((item, i) => (
                      <div key={i} className={styles.itemRow}>
                        <span>{item.name} x {item.quantity}</span>
                        <span>BWP {item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.totalsGrid}>
                  <div className={styles.totalBlock}>
                    <span className={styles.totalLabel}>Total</span>
                    <span className={styles.totalValue}>BWP {receipt.total.toFixed(2)}</span>
                  </div>
                  <div className={styles.totalBlock}>
                    <span className={styles.totalLabel}>Amount Paid</span>
                    <span className={styles.totalValue}>BWP {receipt.cashPaid.toFixed(2)}</span>
                  </div>
                  {receipt.laybuy && (
                    <>
                      <div className={`${styles.totalBlock} ${styles.laybuyBalanceCard}`}>
                        <span className={styles.totalLabel}>Balance</span>
                        <span className={styles.totalValue}>BWP {receipt.laybuy.balanceRemaining.toFixed(2)}</span>
                      </div>
                      <div className={styles.totalBlock}>
                        <span className={styles.totalLabel}>Due Date</span>
                        <span className={styles.totalValue}>{new Date(receipt.laybuy.dueDate).toLocaleDateString()}</span>
                      </div>
                    </>
                  )}
                </div>

                {isOpenLaybuy && (
                  <div className={styles.laybuyPaymentSection}>
                    <div className={styles.laybuyPaymentRow}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmounts[receipt._id] || ''}
                        onChange={(e) => handlePaymentAmountChange(receipt._id, e.target.value)}
                        placeholder="Amount"
                        className={styles.laybuyPaymentInput}
                      />
                      <button
                        onClick={() => handleAddPayment(receipt._id)}
                        disabled={submittingPaymentId === receipt._id}
                        className={styles.laybuyPaymentButton}
                      >
                        {submittingPaymentId === receipt._id ? '...' : 'Add Payment'}
                      </button>
                    </div>
                  </div>
                )}
                {receipt.laybuy?.status === 'completed' && (
                  <div className={styles.laybuyPaidMessage}>✅ Paid in full</div>
                )}

                <button className={styles.downloadButton} onClick={() => exportReceiptToPDF(receipt)} title="Download PDF">
                  <FontAwesomeIcon icon={faDownload} /> PDF
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LaybuyReceipts;