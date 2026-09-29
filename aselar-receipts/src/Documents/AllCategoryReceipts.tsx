import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrash,
  faTimes,
  faExclamationTriangle,
  faDownload
} from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import styles from './AllCategoryReceipts.module.css'; // Assume a similar CSS module for category receipts

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  totalPrice: number;
}

interface Company {
  name: string;
  logo: string;
  address1: string;
  address2: string;
  email: string;
  location: string;
}

// mirrors the laybuy subdocument on the backend
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
  company?: Company;
  refNo?: string;
  seller?: string;
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

interface DeleteModalProps {
  isOpen: boolean;
  receiptId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

type SaleTypeFilter = 'all' | 'full' | 'laybuy';

// NEW: one row of a bar chart — the bar is split into normal and lay-buy portions
interface BarRow {
  label: string;
  normal: number;
  laybuy: number;
}

// how many days out from the due date a reminder starts showing (overdue always shows)
const REMINDER_WINDOW_DAYS = 3;
// localStorage key for dismissed reminders — dismissing a lay-buy hides it here
// until it's fully paid (it naturally drops out of the "active" list once completed)
const DISMISSED_LAYBUYS_KEY = 'aselar_dismissed_laybuy_reminders';
// the backend paginates get-all (default 10). We pull everything so filters, seller
// lookup and the summary are accurate, then paginate in the UI.
const FETCH_ALL_LIMIT = 10000;
const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];
const ITEM_BREAKDOWN_PREVIEW = 8;
// NEW: how many rows each bar chart shows
const CHART_TOP_N = 10;

// yyyy-mm-dd key used by the daily-seller endpoint (same format as Receipt.tsx)
const sellerDateKey = (date?: string) =>
  date ? new Date(date).toISOString().split('T')[0] : '';

// yyyy-mm-dd in the viewer's LOCAL time — used by the date filter so it matches
// the date the user actually sees on the card
const localDateKey = (date?: string) => {
  if (!date) return '';
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

// NEW: simple horizontal bar chart (pure CSS, blue). Dark blue = normal, light blue = lay-buy.
const BarChart: React.FC<{
  title: string;
  rows: BarRow[];
  format: (n: number) => string;
}> = ({ title, rows, format }) => {
  const max = Math.max(...rows.map((r) => r.normal + r.laybuy), 0);

  return (
    <div className={styles.chartCard}>
      <h4 className={styles.summaryTableTitle}>{title}</h4>
      <div className={styles.chartLegend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.chartSegNormal}`} /> Normal
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.chartSegLaybuy}`} /> Lay-buy
        </span>
      </div>
      <div className={styles.chartRows}>
        {rows.map((r) => {
          const total = r.normal + r.laybuy;
          const normalPct = max > 0 ? (r.normal / max) * 100 : 0;
          const laybuyPct = max > 0 ? (r.laybuy / max) * 100 : 0;
          return (
            <div key={r.label} className={styles.chartRow}>
              <div className={styles.chartLabel} title={r.label}>{r.label}</div>
              <div
                className={styles.chartTrack}
                title={`Normal: ${format(r.normal)} | Lay-buy: ${format(r.laybuy)}`}
              >
                {r.normal > 0 && (
                  <div
                    className={`${styles.chartSeg} ${styles.chartSegNormal}`}
                    style={{ width: `${normalPct}%` }}
                  />
                )}
                {r.laybuy > 0 && (
                  <div
                    className={`${styles.chartSeg} ${styles.chartSegLaybuy}`}
                    style={{ width: `${laybuyPct}%` }}
                  />
                )}
              </div>
              <div className={styles.chartValue}>{format(total)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({
  isOpen,
  receiptId,
  onConfirm,
  onCancel,
  isDeleting
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <FontAwesomeIcon icon={faExclamationTriangle} className={styles.warningIcon} />
          <h3>Confirm Deletion</h3>
          <button className={styles.closeButton} onClick={onCancel}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>Are you sure you want to delete this category receipt?</p>
          <p className={styles.receiptId}>Receipt ID: {receiptId.slice(-8)}</p>
          <p className={styles.warningText}>This action cannot be undone.</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className={styles.deleteButton} onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <ClipLoader size={16} color="#fff" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrash} />
                <span>Delete Receipt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const AllCategoryReceipts: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalReceipts, setTotalReceipts] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    receiptId: string;
    receiptName: string;
  }>({
    isOpen: false,
    receiptId: '',
    receiptName: ''
  });

  // Lay-buy specific state — fetched separately from the (paginated) main list
  // so totals/reminders are accurate regardless of pagination
  const [activeLaybuys, setActiveLaybuys] = useState<ReceiptData[]>([]);
  const [laybuyTotalOutstanding, setLaybuyTotalOutstanding] = useState<number>(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // per-card installment payment state
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [submittingPaymentId, setSubmittingPaymentId] = useState<string | null>(null);

  // daily seller names keyed by yyyy-mm-dd, plus a record of dates already requested
  const [dailySellers, setDailySellers] = useState<Record<string, string>>({});
  const fetchedSellerDates = useRef<Set<string>>(new Set());

  // filter + pagination state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [saleTypeFilter, setSaleTypeFilter] = useState<SaleTypeFilter>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [showAllItems, setShowAllItems] = useState<boolean>(false);

  // load dismissed reminder ids once on mount
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

  // Fetch business and profile data once on mount
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
      toast.error('Failed to load business information');
    }
  };

  fetchBusinessAndProfile();
}, []);

  useEffect(() => {
    fetchReceipts();
    fetchActiveLaybuys();
  }, []);

 const fetchReceipts = async () => {
  try {
    setLoading(true);
    const response = await axios.get(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/get-all`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      // ask for everything (backend default is 10) — filtering, the seller
      // lookup and the summary all run on the full set; pagination happens in the UI
      params: { limit: FETCH_ALL_LIMIT, _t: Date.now() },
      withCredentials: true,
    });

    console.log('Fetched receipts data:', response.data); // Debug log
    const receiptsData = response.data.data || [];
    setReceipts(receiptsData);
    setTotalReceipts(receiptsData.length);
  } catch (error: any) {
    console.error('Fetch receipts error:', error);
    if (error.response?.status === 404) {
      console.log('No receipts found (404) - treating as empty');
      setReceipts([]);
      setTotalReceipts(0);
    } else {
      toast.error('Failed to fetch receipts');
    }
  } finally {
    setLoading(false);
  }
};

  // separate, unpaginated fetch of every open lay-buy — powers the total and the reminders
  const fetchActiveLaybuys = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/laybuys`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: { status: 'active', _t: Date.now() },
        withCredentials: true,
      });

      const laybuys: ReceiptData[] = response.data.data || [];
      setActiveLaybuys(laybuys);
      setLaybuyTotalOutstanding(response.data.totalOutstanding ?? 0);
    } catch (error) {
      console.error('Failed to fetch active lay-buys:', error);
      // Non-fatal — the rest of the page still works without this
    }
  };

  // a lay-buy is worth nagging about once it's within the reminder window or overdue
  const daysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const dueSoonOrOverdueLaybuys = activeLaybuys.filter((r) => {
    if (!r.laybuy?.dueDate) return false;
    if (dismissedIds.has(r._id)) return false;
    return daysUntilDue(r.laybuy.dueDate) <= REMINDER_WINDOW_DAYS;
  });

  // dismiss a reminder — persists per-browser until the lay-buy is fully paid
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

  // badge styling — orange while active, red once overdue, green once fully paid
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

  // seller-name fallback — per-receipt seller (if the backend set one) first,
  // then the business name, then 'Unknown Seller'. Mirrors the PDF-service priority.
  // Daily seller fetch — one request per unique receipt date, same endpoint as Receipt.tsx
  useEffect(() => {
    const dates = Array.from(
      new Set(receipts.map((r) => sellerDateKey(r.createdAt)).filter(Boolean))
    ).filter((d) => !fetchedSellerDates.current.has(d));

    if (dates.length === 0) return;
    dates.forEach((d) => fetchedSellerDates.current.add(d));

    const token = localStorage.getItem('token');
    Promise.all(
      dates.map(async (d): Promise<[string, string]> => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/daily-seller/${d}`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          });
          return [d, res.data?.name || ''];
        } catch (err) {
          return [d, '']; // no seller for that day — falls back to business name
        }
      })
    ).then((entries) => {
      setDailySellers((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
  }, [receipts]);

  const getSellerName = (receipt: ReceiptData) =>
    receipt.seller ||
    dailySellers[sellerDateKey(receipt.createdAt)] ||
    profileData?.nameOfBusiness ||
    'Unknown Seller';

  // ───────────── filtering, summary, pagination ─────────────

  // every distinct seller across all receipts (recomputes as daily sellers load in)
  const sellerOptions = useMemo(
    () => Array.from(new Set(receipts.map((r) => getSellerName(r)))).sort((a, b) => a.localeCompare(b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [receipts, dailySellers, profileData]
  );

  const filteredReceipts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return receipts.filter((r) => {
      // sale type — "normal" means anything that isn't a lay-buy (covers older receipts with no saleType)
      if (saleTypeFilter === 'laybuy' && r.saleType !== 'laybuy') return false;
      if (saleTypeFilter === 'full' && r.saleType === 'laybuy') return false;

      // receipt number (also matches the short id shown when there's no receiptsNumber)
      if (term) {
        const number = (r.receiptsNumber || r._id.slice(-6)).toLowerCase();
        if (!number.includes(term)) return false;
      }

      // date range (inclusive, local time)
      if (dateFrom || dateTo) {
        const key = localDateKey(r.createdAt);
        if (!key) return false;
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
      }

      // seller
      if (sellerFilter !== 'all' && getSellerName(r) !== sellerFilter) return false;

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipts, searchTerm, dateFrom, dateTo, sellerFilter, saleTypeFilter, dailySellers, profileData]);

  // summary over the WHOLE filtered set (all pages). Cancelled/refunded receipts are excluded.
  const summary = useMemo(() => {
    const countable = filteredReceipts.filter(
      (r) => (!r.status || r.status === 'completed') && r.laybuy?.status !== 'cancelled'
    );

    let totalSales = 0;
    let collected = 0;
    let outstanding = 0;
    let itemsSold = 0;
    let laybuyCount = 0;
    let normalCount = 0;
    // CHANGED: item and seller maps now also track the normal / lay-buy split for the charts
    const itemMap = new Map<
      string,
      {
        name: string;
        quantity: number;
        revenue: number;
        normalQty: number;
        laybuyQty: number;
        normalRevenue: number;
        laybuyRevenue: number;
      }
    >();
    const sellerMap = new Map<
      string,
      { name: string; receipts: number; total: number; normalTotal: number; laybuyTotal: number }
    >();

    countable.forEach((r) => {
      const isLay = r.saleType === 'laybuy';
      totalSales += r.total;
      if (isLay) {
        laybuyCount += 1;
        collected += r.cashPaid;
        if (r.laybuy && r.laybuy.status !== 'completed') outstanding += r.laybuy.balanceRemaining;
      } else {
        normalCount += 1;
        collected += r.total;
      }

      (r.items || []).forEach((item) => {
        itemsSold += item.quantity;
        const key = item.name.trim().toLowerCase();
        let entry = itemMap.get(key);
        if (!entry) {
          entry = {
            name: item.name.trim(),
            quantity: 0,
            revenue: 0,
            normalQty: 0,
            laybuyQty: 0,
            normalRevenue: 0,
            laybuyRevenue: 0,
          };
          itemMap.set(key, entry);
        }
        entry.quantity += item.quantity;
        entry.revenue += item.totalPrice;
        if (isLay) {
          entry.laybuyQty += item.quantity;
          entry.laybuyRevenue += item.totalPrice;
        } else {
          entry.normalQty += item.quantity;
          entry.normalRevenue += item.totalPrice;
        }
      });

      const seller = getSellerName(r);
      let s = sellerMap.get(seller);
      if (!s) {
        s = { name: seller, receipts: 0, total: 0, normalTotal: 0, laybuyTotal: 0 };
        sellerMap.set(seller, s);
      }
      s.receipts += 1;
      s.total += r.total;
      if (isLay) s.laybuyTotal += r.total;
      else s.normalTotal += r.total;
    });

    const items = Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue);
    const sellers = Array.from(sellerMap.values()).sort((a, b) => b.total - a.total);

    // NEW: chart data — top N rows, split into normal / lay-buy
    const qtyChart: BarRow[] = [...items]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, CHART_TOP_N)
      .map((i) => ({ label: i.name, normal: i.normalQty, laybuy: i.laybuyQty }));
    const revenueChart: BarRow[] = items
      .slice(0, CHART_TOP_N)
      .map((i) => ({ label: i.name, normal: i.normalRevenue, laybuy: i.laybuyRevenue }));
    const sellerChart: BarRow[] = sellers
      .slice(0, CHART_TOP_N)
      .map((s) => ({ label: s.name, normal: s.normalTotal, laybuy: s.laybuyTotal }));

    return {
      count: countable.length,
      totalSales,
      collected,
      outstanding,
      itemsSold,
      laybuyCount,
      normalCount,
      items,
      sellers,
      qtyChart,
      revenueChart,
      sellerChart,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredReceipts, dailySellers, profileData]);

  // back to page 1 whenever the filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, sellerFilter, saleTypeFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedReceipts = filteredReceipts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasActiveFilters =
    searchTerm !== '' || dateFrom !== '' || dateTo !== '' || sellerFilter !== 'all' || saleTypeFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSellerFilter('all');
    setSaleTypeFilter('all');
  };

  const money = (n: number) => `BWP ${n.toFixed(2)}`;

  // ───────────── end filtering/summary ─────────────

  // per-card installment payment
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
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      const data = response.data;

      if (data.success) {
        const updatedReceipt: ReceiptData = data.data;

        // Update the card in place so the UI reflects the new balance immediately
        setReceipts((prev) =>
          prev.map((r) => (r._id === receiptId ? updatedReceipt : r))
        );
        setPaymentAmounts((prev) => ({ ...prev, [receiptId]: '' }));

        toast.success(
          updatedReceipt.laybuy?.status === 'completed'
            ? 'Lay-buy fully paid off!'
            : 'Payment recorded'
        );

        // Refresh the outstanding total / reminders so they stay accurate
        fetchActiveLaybuys();
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

  const exportReceiptToPDF = (receipt: ReceiptData, profile: ProfileData | null, business: BusinessData | null) => {
    const doc = new jsPDF();
    const isLaybuy = receipt.saleType === 'laybuy';
    
    // Company Header
    const companyName = profile?.nameOfBusiness || 'TeX-Technology Extreme';
    const logoUrl = profile?.profilePicture || '/default-logo.png';
    const address1 = business?.place || 'Plot 1234';
    const address2 = business?.businessDescription || 'Box 3456, Phakalane';
    const email = profile?.emailBusiness || 'tex@robotics.bw';
    const location = business?.businessNature || 'Fair Grounds';
    // seller-name fallback, same priority as the live card view
    const sellerName = getSellerName(receipt);
    
    // Add logo if available (fetch and add as base64)
    if (logoUrl && logoUrl !== '/default-logo.png') {
      // For simplicity, assume logo is accessible; in production, fetch as base64
      doc.addImage(logoUrl, 'PNG', 14, 20, 30, 30);
    }
    
    doc.setFontSize(16);
    doc.text(companyName, 50, 25);
    doc.setFontSize(10);
    doc.text(address1, 50, 35);
    doc.text(address2, 50, 40);
    doc.text(email, 50, 45);
    doc.text(location, 50, 50);
    
    // Receipt Header
    doc.setFontSize(18);
    doc.text(isLaybuy ? 'LAY-BUY RECEIPT' : 'RECEIPT', 105, 70, { align: 'center' });
    const receiptDate = receipt.createdAt;
    if (receiptDate) {
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(receiptDate).toLocaleDateString()}`, 105, 80, { align: 'center' });
    }
    doc.text(`Receipt #: ${receipt.receiptsNumber || receipt._id.slice(-6)}`, 105, 85, { align: 'center' });
    // seller line alongside the receipt number
    doc.text(`Seller: ${sellerName}`, 105, 90, { align: 'center' });
    if (receipt.status) {
      doc.text(`Status: ${receipt.status.toUpperCase()}`, 105, 95, { align: 'center' });
    }
    
    // Items Table
    let yPosition = receipt.status ? 105 : 100;
    doc.setFontSize(14);
    doc.text('Item', 14, yPosition);
    doc.text('Qty', 60, yPosition);
    doc.text('Price (P)', 80, yPosition);
    doc.text('Total (P)', 120, yPosition);
    
    yPosition += 5;
    receipt.items?.forEach((item) => {
      doc.setFontSize(10);
      doc.text(item.name, 14, yPosition);
      doc.text(item.quantity.toString(), 60, yPosition);
      doc.text(item.price.toFixed(2), 80, yPosition);
      doc.text(item.totalPrice.toFixed(2), 120, yPosition);
      yPosition += 7;
    });
    
    // Totals Section
    const totalY = yPosition + 10;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, totalY - 2, 195, totalY - 2); // Divider line
    
    yPosition = totalY + 5;
    doc.setFontSize(12);
    doc.text(`Subtotal: BWP ${receipt.subtotal.toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`Discount: -BWP ${receipt.discount.toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`VAT: BWP ${receipt.vat.toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;
    doc.text(`Total: BWP ${receipt.total.toFixed(2)}`, 100, yPosition, { align: 'right' });
    yPosition += 7;

    // lay-buy sales show amount paid/balance/due date instead of cash paid + change
    if (isLaybuy && receipt.laybuy) {
      doc.text(`Amount Paid: BWP ${receipt.cashPaid.toFixed(2)}`, 100, yPosition, { align: 'right' });
      yPosition += 7;
      doc.text(`Balance Remaining: BWP ${receipt.laybuy.balanceRemaining.toFixed(2)}`, 100, yPosition, { align: 'right' });
      yPosition += 7;
      doc.text(`Due Date: ${new Date(receipt.laybuy.dueDate).toLocaleDateString()}`, 100, yPosition, { align: 'right' });
      yPosition += 7;
      doc.text(`Status: ${receipt.laybuy.status.toUpperCase()}`, 100, yPosition, { align: 'right' });
      yPosition += 7;
    } else {
      doc.text(`Cash Paid: BWP ${receipt.cashPaid.toFixed(2)}`, 100, yPosition, { align: 'right' });
      yPosition += 7;
      doc.text(`Change: BWP ${receipt.change.toFixed(2)}`, 100, yPosition, { align: 'right' });
    }
    
    // Footer
    yPosition += 15;
    doc.setFontSize(8);
    doc.text('Powered by Aselar, a TeX product.', 105, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text('Thank you for your business!', 105, yPosition + 5, { align: 'center' });
    
    // Save PDF
    const fileName = `CategoryReceipt_${receipt.receiptsNumber || receipt._id.slice(-8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  // takes the receipt itself (not an index) — indexes break once the list is filtered/paginated
  const handleDownload = (receipt: ReceiptData) => {
    if (!receipt || !profileData || !businessData) {
      toast.error('Missing receipt or business data');
      return;
    }
    
    exportReceiptToPDF(receipt, profileData, businessData);
    toast.success('PDF downloaded!');
  };

  const openDeleteModal = (receiptId: string, receiptName: string) => {
    setDeleteModal({
      isOpen: true,
      receiptId,
      receiptName
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      receiptId: '',
      receiptName: ''
    });
  };

  const handleDelete = async () => {
    const { receiptId } = deleteModal;
    setDeletingId(receiptId);
    
    try {
      await axios.delete(`${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/receipt/${receiptId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        withCredentials: true,
      });
      toast.success('Receipt deleted successfully!');
      fetchReceipts();
      fetchActiveLaybuys(); // keep totals/reminders in sync if a lay-buy was deleted
      closeDeleteModal();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to delete receipt: ${error.response?.data?.message || error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

  const formatFileSize = (receipt: ReceiptData) => {
    const itemCount = receipt.items?.length || 0;
    const baseSize = 2.5;
    const itemSize = itemCount * 0.3;
    return `${(baseSize + itemSize).toFixed(1)} KB`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#6366f1" />
        <p>Loading your category receipts...</p>
      </div>
    );
  }

  return (
    <div className={styles.cover}>
      <div className={styles.topTitles}>
        <div className={styles.headerLeft}>
          <h2 className={styles.pageTitle}>Category Receipts Manager</h2>
          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{totalReceipts}</span>
              <span className={styles.statLabel}>Total Category Receipts</span>
            </div>
            {/* total outstanding across every open lay-buy */}
            {laybuyTotalOutstanding > 0 && (
              <div className={`${styles.statCard} ${styles.laybuyStatCard}`}>
                <span className={styles.statNumber}>BWP {laybuyTotalOutstanding.toFixed(2)}</span>
                <span className={styles.statLabel}>Lay-buy Balance Outstanding</span>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <Link to="/generative-scanner">
            <button className={styles.buttonReceipt}>New Category Receipt</button>
          </Link>
          <Link to="/current-receipt">
            <button className={styles.buttonRecent}>Recent Category Receipt</button>
          </Link>
        </div>
      </div>

      {/* dismissible reminders for lay-buys that are due soon or overdue */}
      {dueSoonOrOverdueLaybuys.length > 0 && (
        <div className={styles.reminderBanner}>
          {dueSoonOrOverdueLaybuys.map((r) => {
            const days = daysUntilDue(r.laybuy!.dueDate);
            const isOverdue = days < 0;
            return (
              <div
                key={r._id}
                className={`${styles.reminderItem} ${isOverdue ? styles.reminderOverdue : ''}`}
              >
                <span>
                  {isOverdue
                    ? `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}: `
                    : days === 0
                    ? 'Due today: '
                    : `Due in ${days} day${days === 1 ? '' : 's'}: `}
                  Lay-buy {r.receiptsNumber || r._id.slice(-6)} — Balance BWP {r.laybuy!.balanceRemaining.toFixed(2)}
                </span>
                <button
                  className={styles.reminderDismiss}
                  onClick={() => dismissReminder(r._id)}
                  title="Dismiss reminder"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {receipts.length === 0 ? (
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>💸</div>
          <h3>No category receipts found</h3>
          <p>You haven't created any category receipts yet.</p>
          <Link to="/quick-category-receipt">
            <button className={styles.createButton}>Create Your First Category Receipt</button>
          </Link>
        </div>
      ) : (
        <>
          {/* filter bar */}
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Receipt number</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. RC-1A2B"
                className={styles.filterInput}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>From</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className={styles.filterInput}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>To</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className={styles.filterInput}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Seller</label>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className={styles.filterInput}
              >
                <option value="all">All sellers</option>
                {sellerOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Sale type</label>
              <div className={styles.typeChips}>
                {([
                  ['all', 'All'],
                  ['full', 'Normal'],
                  ['laybuy', 'Lay-buy'],
                ] as [SaleTypeFilter, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSaleTypeFilter(value)}
                    className={`${styles.chip} ${saleTypeFilter === value ? styles.chipActive : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className={styles.clearFilters}>
                <FontAwesomeIcon icon={faTimes} /> Clear filters
              </button>
            )}
          </div>

          {/* summary for everything matching the current filters (all pages) */}
          <div className={styles.summaryPanel}>
            <div className={styles.summaryCards}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>{filteredReceipts.length}</span>
                <span className={styles.summaryLabel}>
                  Receipts shown{hasActiveFilters ? ` (of ${receipts.length})` : ''}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>{money(summary.totalSales)}</span>
                <span className={styles.summaryLabel}>Total sales</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>{money(summary.collected)}</span>
                <span className={styles.summaryLabel}>Collected</span>
              </div>
              {summary.outstanding > 0 && (
                <div className={`${styles.summaryCard} ${styles.summaryCardWarn}`}>
                  <span className={styles.summaryValue}>{money(summary.outstanding)}</span>
                  <span className={styles.summaryLabel}>Lay-buy outstanding</span>
                </div>
              )}
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>{summary.itemsSold}</span>
                <span className={styles.summaryLabel}>Items sold</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>{summary.normalCount} / {summary.laybuyCount}</span>
                <span className={styles.summaryLabel}>Normal / Lay-buy</span>
              </div>
            </div>

            {summary.items.length > 0 && (
              <div className={styles.summaryTables}>
                <div className={styles.tableWrap}>
                  <h4 className={styles.summaryTableTitle}>
                    Items sold{sellerFilter !== 'all' ? ` — ${sellerFilter}` : ''}
                  </h4>
                  <table className={styles.summaryTable}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllItems ? summary.items : summary.items.slice(0, ITEM_BREAKDOWN_PREVIEW)).map((it) => (
                        <tr key={it.name}>
                          <td>{it.name}</td>
                          <td>{it.quantity}</td>
                          <td>{money(it.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {summary.items.length > ITEM_BREAKDOWN_PREVIEW && (
                    <button
                      type="button"
                      className={styles.showMoreButton}
                      onClick={() => setShowAllItems((v) => !v)}
                    >
                      {showAllItems ? 'Show less' : `Show all ${summary.items.length} items`}
                    </button>
                  )}
                </div>

                {/* per-seller breakdown, only useful when not already filtered to one seller */}
                {sellerFilter === 'all' && summary.sellers.length > 0 && (
                  <div className={styles.tableWrap}>
                    <h4 className={styles.summaryTableTitle}>Sales by seller</h4>
                    <table className={styles.summaryTable}>
                      <thead>
                        <tr>
                          <th>Seller</th>
                          <th>Receipts</th>
                          <th>Total sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.sellers.map((s) => (
                          <tr key={s.name}>
                            <td>{s.name}</td>
                            <td>{s.receipts}</td>
                            <td>{money(s.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* NEW: blue bar charts below the numbers — dark blue = normal, light blue = lay-buy */}
            {summary.items.length > 0 && (
              <div className={styles.chartsGrid}>
                <BarChart
                  title={`Items sold — quantity (top ${Math.min(CHART_TOP_N, summary.qtyChart.length)})`}
                  rows={summary.qtyChart}
                  format={(n) => String(n)}
                />
                <BarChart
                  title={`Items sold — revenue (top ${Math.min(CHART_TOP_N, summary.revenueChart.length)})`}
                  rows={summary.revenueChart}
                  format={money}
                />
                {sellerFilter === 'all' && summary.sellerChart.length > 0 && (
                  <BarChart
                    title="Sales by seller"
                    rows={summary.sellerChart}
                    format={money}
                  />
                )}
              </div>
            )}
          </div>

          {filteredReceipts.length === 0 ? (
            <div className={styles.noDataContainer}>
              <div className={styles.noDataIcon}>🔍</div>
              <h3>No receipts match your filters</h3>
              <p>Try a different receipt number, date range, seller or sale type.</p>
              <button className={styles.createButton} onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
          <div className={styles.receiptsGrid}>
            {pagedReceipts.map((receipt) => {
              const isLaybuy = receipt.saleType === 'laybuy';
              const isOpenLaybuy = isLaybuy && receipt.laybuy && receipt.laybuy.status !== 'completed' && receipt.laybuy.status !== 'cancelled';
              return (
              <div key={receipt._id} className={styles.receiptCard}>
                <div className={styles.cardPreview}>
                  <div className={styles.wrapper}>
                    <div className={styles.addressPlusLogo}>
                      <img src={profileData?.profilePicture || '/default-logo.png'} alt={`${profileData?.nameOfBusiness || 'Company'} logo`} className={styles.logo} />
                      <div className={styles.text}>
                        <h4>{profileData?.nameOfBusiness || 'TeX-Technology Extreme'}</h4>
                        <h4>{businessData?.place || 'Plot 1234'}</h4>
                        <h4>{businessData?.businessDescription || 'Box 3456, Phakalane'}</h4>
                        <h4>{profileData?.emailBusiness || 'tex@robotics.bw'}</h4>
                        <h4>{businessData?.businessNature || 'Fair Grounds'}</h4>
                      </div>
                    </div>

                    <div className={styles.receiptHeader}>
                      <div className={styles.receiptTitleRow}>
                        <h3>CATEGORY RECEIPT</h3>
                        {/* lay-buy badge — orange/red/green depending on status */}
                        {isLaybuy && <span className={laybuyBadgeClass(receipt)}>{laybuyBadgeLabel(receipt)}</span>}
                      </div>
                      {receipt.createdAt && (
                        <h4>Date: {formatDate(receipt.createdAt)}</h4>
                      )}
                      {receipt.status && (
                        <h4 className={styles.statusText}>Status: {receipt.status.toUpperCase()}</h4>
                      )}
                      <h4>Receipt ID: {receipt.receiptsNumber || receipt._id.slice(-6)}</h4>
                      {/* seller line, mirrors the fallback used in the PDF export */}
                      <h4 className={styles.sellerLine}>Seller: {getSellerName(receipt)}</h4>
                    </div>
            
                    <div className={styles.items}>
                      <h4>Item</h4>
                      <h4>Qty</h4>
                      <h4>Price(P)</h4>
                      <h4>Total(P)</h4>
                    </div>
            
                    {receipt.items && receipt.items.length > 0 ? (
                      <div className={styles.itemsContainer}>
                        {receipt.items.map((item, itemIndex) => (
                          <div key={itemIndex} className={styles.contentsOfReceipts}>
                            <div className={styles.productName}>{item.name}</div>
                            <div className={styles.quantity}>{item.quantity}</div>
                            <div className={styles.price}>{item.price.toFixed(2)}</div>
                            <div className={styles.totalPrice}>{item.totalPrice.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.noProducts}>No items found.</p>
                    )}
            
                    <div className={styles.divider}></div>
                    
                    <div className={styles.adding}>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Subtotal-P</h4>
                        <div className={styles.totalAmount}>BWP {receipt.subtotal.toFixed(2)}</div>
                      </div>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Discount-P</h4>
                        <div className={styles.totalAmount}>-BWP {receipt.discount.toFixed(2)}</div>
                      </div>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Vat-P</h4>
                        <div className={styles.totalAmount}>BWP {receipt.vat.toFixed(2)}</div>
                      </div>
                      <div className={styles.total}>
                        <h4 className={styles.totalHeader}>Total-P</h4>
                        <div className={styles.totalAmount}>BWP {receipt.total.toFixed(2)}</div>
                      </div>
                      {/* lay-buy shows amount paid/balance/due date instead of cash paid + change */}
                      {isLaybuy && receipt.laybuy ? (
                        <>
                          <div className={styles.total}>
                            <h4 className={styles.totalHeader}>Amount Paid</h4>
                            <div className={styles.totalAmount}>BWP {receipt.cashPaid.toFixed(2)}</div>
                          </div>
                          <div className={`${styles.total} ${styles.laybuyBalanceCard}`}>
                            <h4 className={styles.totalHeader}>Balance Remaining</h4>
                            <div className={styles.totalAmount}>BWP {receipt.laybuy.balanceRemaining.toFixed(2)}</div>
                          </div>
                          <div className={styles.total}>
                            <h4 className={styles.totalHeader}>Due Date</h4>
                            <div className={styles.totalAmount}>{new Date(receipt.laybuy.dueDate).toLocaleDateString()}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles.total}>
                            <h4 className={styles.totalHeader}>Cash Paid</h4>
                            <div className={styles.totalAmount}>BWP {receipt.cashPaid.toFixed(2)}</div>
                          </div>
                          <div className={styles.total}>
                            <h4 className={styles.totalHeader}>Change</h4>
                            <div className={styles.totalAmount}>BWP {receipt.change.toFixed(2)}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* per-card installment payment, only for open lay-buys */}
                    {isOpenLaybuy && (
                      <div className={styles.laybuyPaymentSection}>
                        <h4 className={styles.laybuyPaymentTitle}>Record a payment</h4>
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
                            {submittingPaymentId === receipt._id ? '...' : 'Add'}
                          </button>
                        </div>
                      </div>
                    )}
                    {isLaybuy && receipt.laybuy?.status === 'completed' && (
                      <div className={styles.laybuyPaidMessage}>✅ Paid in full</div>
                    )}
            
                    <div className={styles.footer}>
                      <p className={styles.tag}>Powered by Aselar, a TeX product.</p>
                      <p className={styles.thankYou}>Thank you for your business!</p>
                    </div>
                  </div>
                </div>

                <div className={styles.cardInfo}>
                  <h4 className={styles.cardTitle}>Category Receipt {receipt.receiptsNumber || receipt._id.slice(-8)}</h4>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardSize}>{formatFileSize(receipt)}</span>
                    <span className={styles.cardDate}>{formatDate(receipt.createdAt)}</span>
                  </div>
                </div>
                
                <div className={styles.cardActions}>
                  <button 
                    className={`${styles.actionButton} ${styles.downloadButton}`}
                    onClick={() => handleDownload(receipt)}
                    title="Download PDF"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                  </button>
                  
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => openDeleteModal(receipt._id, `Category Receipt ${receipt.receiptsNumber || receipt._id.slice(-8)}`)}
                    disabled={!!deletingId}
                    title="Delete Receipt"
                  >
                    {deletingId === receipt._id ? (
                      <ClipLoader size={16} color="#fff" />
                    ) : (
                      <FontAwesomeIcon icon={faTrash} />
                    )}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
          )}

          {/* pagination */}
          {filteredReceipts.length > 0 && (
            <div className={styles.pagination}>
              <div className={styles.pageSizeWrap}>
                <label className={styles.filterLabel}>Per page</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className={styles.pageSizeSelect}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className={styles.pageControls}>
                <button
                  className={styles.pageButton}
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                >
                  «
                </button>
                <button
                  className={styles.pageButton}
                  onClick={() => setCurrentPage(safePage - 1)}
                  disabled={safePage === 1}
                >
                  Prev
                </button>
                <span className={styles.pageInfo}>
                  Page {safePage} of {totalPages}
                  <span className={styles.pageRange}>
                    {' '}({(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredReceipts.length)} of {filteredReceipts.length})
                  </span>
                </span>
                <button
                  className={styles.pageButton}
                  onClick={() => setCurrentPage(safePage + 1)}
                  disabled={safePage === totalPages}
                >
                  Next
                </button>
                <button
                  className={styles.pageButton}
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage === totalPages}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        receiptId={deleteModal.receiptId}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
        isDeleting={!!deletingId}
      />
    </div>
  );
};

export default AllCategoryReceipts;