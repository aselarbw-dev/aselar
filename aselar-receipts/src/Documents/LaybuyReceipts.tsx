import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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

// one logged payment (deposit or installment) with how it was paid
interface LaybuyPayment {
  amount: number;
  method: string;
  paidAt: string;
}

interface LaybuyDetails {
  dueDate: string;
  balanceRemaining: number;
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  payments?: LaybuyPayment[]; // empty/missing on older lay-buys
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
// same methods as the POS payment modal (Lay-buy itself isn't a way to pay an installment)
const PAYMENT_METHOD_OPTIONS = ['Cash', 'Swiped', 'Orange Money', 'MyZaka', 'Other'] as const;
// NEW: customer search starts at this many characters (the server enforces it too)
const CUSTOMER_SEARCH_MIN_CHARS = 3;
const EMPTY_IDS = new Set<string>();

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

  // NEW: which lay-buys the server says belong to the customer being searched.
  // Only receipt ids are kept here — the customer details themselves never reach the browser.
  const [customerMatches, setCustomerMatches] = useState<{ term: string; ids: Set<string> }>({
    term: '',
    ids: EMPTY_IDS,
  });
  const [searchingCustomer, setSearchingCustomer] = useState<boolean>(false);

  // Reminders (shared dismiss logic with AllCategoryReceipts)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Per-card installment payment state
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [submittingPaymentId, setSubmittingPaymentId] = useState<string | null>(null);
  // the payment waiting for the cashier to pick a method
  const [pendingPayment, setPendingPayment] = useState<{ receiptId: string; amount: number } | null>(null);

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

  // NEW: customer search. Once the box has enough characters, ask the server which lay-buys
  // belong to a matching name / ID-passport / phone. We keep only the matching receipt ids.
  useEffect(() => {
    const term = searchTerm.trim();

    if (term.length < CUSTOMER_SEARCH_MIN_CHARS) {
      setCustomerMatches({ term: '', ids: EMPTY_IDS });
      setSearchingCustomer(false);
      return;
    }

    let cancelled = false;
    setSearchingCustomer(true);

    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/laybuys`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          params: { customer: term, _t: Date.now() },
          withCredentials: true,
        });
        if (cancelled) return;
        const ids: string[] = (response.data.data || []).map((r: ReceiptData) => r._id);
        setCustomerMatches({ term, ids: new Set(ids) });
      } catch (error) {
        if (cancelled) return;
        console.error('Customer search failed:', error);
        setCustomerMatches({ term: '', ids: EMPTY_IDS });
        toast.warning('Customer search is unavailable right now. Receipt numbers still work.', {
          toastId: 'customer-search-failed',
        });
      } finally {
        if (!cancelled) setSearchingCustomer(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

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

  // Filtering: receipt number search (plus customer matches from the server) + due-date range,
  // applied client-side over the already-fetched lay-buy list
  const filteredLaybuys = useMemo(() => {
    const rawTerm = searchTerm.trim();
    const term = rawTerm.toLowerCase();
    // only trust customer matches that belong to the term currently in the box
    const customerIds = customerMatches.term === rawTerm ? customerMatches.ids : EMPTY_IDS;

    return laybuys.filter((r) => {
      if (term) {
        const matchesNumber = r.receiptsNumber?.toLowerCase().includes(term);
        const matchesId = r._id.toLowerCase() === term; // full id only, so numbers like phones can't match by accident
        const matchesCustomer = customerIds.has(r._id);
        if (!matchesNumber && !matchesId && !matchesCustomer) return false;
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
  }, [laybuys, searchTerm, fromDate, toDate, customerMatches]);

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

  // "Add Payment" only validates and opens the method popup.
  // The request is sent from confirmPayment once a method is chosen.
  const handleAddPayment = (receiptId: string) => {
    const amount = Number(paymentAmounts[receiptId]);
    if (!amount || amount <= 0) {
      toast.warning('Enter a valid payment amount');
      return;
    }

    // mirror the backend overpayment check (in cents to avoid float surprises)
    const receipt = laybuys.find((r) => r._id === receiptId);
    const balance = receipt?.laybuy?.balanceRemaining ?? 0;
    if (Math.round(amount * 100) > Math.round(balance * 100)) {
      toast.warning(`Payment exceeds the remaining balance of BWP ${balance.toFixed(2)}`);
      return;
    }

    setPendingPayment({ receiptId, amount });
  };

  // sends the payment together with the chosen method
  const confirmPayment = async (method: string) => {
    if (!pendingPayment) return;
    const { receiptId, amount } = pendingPayment;

    setPendingPayment(null);
    setSubmittingPaymentId(receiptId);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/laybuys/${receiptId}/pay`,
        { amount, method },
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
            : `Payment recorded (${method})`
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

  const trimmedSearch = searchTerm.trim();

  return (
    <div className={styles.cover}>
      <div className={styles.topTitles}>
        <h2 className={styles.pageTitle}>Lay-buy Receipts</h2>
        <div className={styles.statsCards}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{laybuys.length}</span>
            <span className={styles.statLabel}>Total Lay-buys</span>
            <Link to="/sellers-performance" className={styles.viewPerformanceLink}>
              View Seller Performance
            </Link>
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
            placeholder="Search receipt no., customer name, ID/passport or phone"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            autoComplete="off"
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

      {/* NEW: small hint under the search box */}
      {trimmedSearch && trimmedSearch.length < CUSTOMER_SEARCH_MIN_CHARS && (
        <p className={styles.searchHint}>
          Type at least {CUSTOMER_SEARCH_MIN_CHARS} characters to search by customer name, ID/passport or phone.
        </p>
      )}
      {searchingCustomer && <p className={styles.searchHint}>Searching…</p>}

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
          <h3>{searchingCustomer ? 'Searching…' : 'No lay-buy receipts found'}</h3>
          <p>
            {laybuys.length === 0
              ? 'No lay-buy sales have been made yet.'
              : 'Try adjusting your search or date filters. Lay-buys made before customer details were collected can only be found by receipt number.'}
          </p>
        </div>
      ) : (
        <div className={styles.receiptsGrid}>
          {filteredLaybuys.map((receipt) => {
            const isOpenLaybuy = receipt.laybuy && receipt.laybuy.status !== 'completed' && receipt.laybuy.status !== 'cancelled';
            const payments = receipt.laybuy?.payments || [];
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

                {/* payment history — only lay-buys made after the ledger existed have entries */}
                {payments.length > 0 && (
                  <div className={styles.paymentHistory}>
                    <span className={styles.paymentHistoryTitle}>Payments</span>
                    {payments.map((p, i) => (
                      <div key={i} className={styles.paymentHistoryRow}>
                        <span>{new Date(p.paidAt).toLocaleDateString()} · {p.method}</span>
                        <span>BWP {p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

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

      {/* "How did the customer pay?" popup for installments */}
      {pendingPayment && (
        <div className={styles.methodOverlay} onClick={() => setPendingPayment(null)}>
          <div className={styles.methodModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.methodTitle}>How did the customer pay?</h3>
            <p className={styles.methodSubtitle}>BWP {pendingPayment.amount.toFixed(2)}</p>
            {PAYMENT_METHOD_OPTIONS.map((method) => (
              <button
                key={method}
                type="button"
                className={styles.methodOption}
                onClick={() => confirmPayment(method)}
              >
                {method}
              </button>
            ))}
            <button type="button" className={styles.methodCancel} onClick={() => setPendingPayment(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaybuyReceipts;