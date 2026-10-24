import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { useSellerContext } from '../Sellers/SellerNameProvider';
import styles from './SellersPerformance.module.css';

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
}

interface ReceiptData {
  _id: string;
  items: ReceiptItem[];
  total: number;
  cashPaid: number;
  receiptsNumber?: string;
  createdAt?: string;
  status?: string;
  seller?: string; // saved on each receipt since the seller field was added
  saleType?: 'full' | 'laybuy';
  laybuy?: LaybuyDetails;
}

interface WeekSummary {
  start: Date;
  normalCount: number;
  normalTotal: number;
  laybuyCount: number;
  laybuyTotal: number;
  collected: number;
}

// who the page thinks the viewer is
type IdentityState = 'checking' | 'ready' | 'unauthorized' | 'none';

// the backend paginates get-all (default 10), so we ask for everything and group in the UI
const FETCH_ALL_LIMIT = 10000;

const pad = (n: number) => String(n).padStart(2, '0');

// yyyy-mm-dd in the viewer's local time
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localDateKey = (date?: string) => (date ? keyOf(new Date(date)) : '');

// yyyy-mm-dd key used by the daily-seller records (same format as AllCategoryReceipts / Receipt.tsx)
const sellerDateKey = (date?: string) =>
  date ? new Date(date).toISOString().split('T')[0] : '';

// weeks run Monday to Sunday
const startOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - offset);
  return d;
};

const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const money = (n: number) => `BWP ${n.toFixed(2)}`;

const shortDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const weekLabel = (start: Date) => {
  const end = addDays(start, 6);
  return `${shortDate(start)} – ${shortDate(end)}, ${end.getFullYear()}`;
};

const SellersPerformance: React.FC = () => {
  const { sellerName } = useSellerContext();
  const contextName = (sellerName || '').trim();

  // NEW: if the context is empty (e.g. after a page reload), ask the server who today's seller is
  const [serverSeller, setServerSeller] = useState<string>('');
  const [identity, setIdentity] = useState<IdentityState>('checking');

  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));

  // NEW: seller per day for the whole account (one request), used for receipts without a saved seller
  const [sellerByDate, setSellerByDate] = useState<Record<string, string>>({});
  const [resolvingSellers, setResolvingSellers] = useState<boolean>(true);

  // NEW: work out who is viewing. Context first; otherwise today's seller from the server.
  // This is the authorized lookup, so a removed/deactivated seller gets a 403 here and sees nothing.
  useEffect(() => {
    if (contextName) {
      setIdentity('ready');
      return;
    }

    let cancelled = false;
    const checkIdentity = async () => {
      setIdentity('checking');
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/daily-seller/${today}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          withCredentials: true,
        });
        if (cancelled) return;
        const name = (res.data?.name || '').trim();
        setServerSeller(name);
        setIdentity(name ? 'ready' : 'none');
      } catch (error: any) {
        if (cancelled) return;
        setIdentity(error.response?.status === 403 ? 'unauthorized' : 'none');
      }
    };
    checkIdentity();

    return () => {
      cancelled = true;
    };
  }, [contextName]);

  const mine = contextName || serverSeller;

  // load every receipt once
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/get-all`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            params: { limit: FETCH_ALL_LIMIT, _t: Date.now() },
            withCredentials: true,
          }
        );
        setReceipts(response.data.data || []);
      } catch (error: any) {
        console.error('Failed to load receipts:', error);
        if (error.response?.status === 404) {
          setReceipts([]);
        } else {
          toast.error('Failed to load your sales');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // NEW: seller per day, one request. Only matters for older receipts that never stored a seller.
  useEffect(() => {
    const loadSellerHistory = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/daily-seller/range`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          withCredentials: true,
        });
        const data = res.data;
        setSellerByDate(data && typeof data === 'object' && !Array.isArray(data) ? data : {});
      } catch (error) {
        console.error('Failed to load seller history:', error);
        toast.warning('Could not load seller history, so older receipts may be missing.');
      } finally {
        setResolvingSellers(false);
      }
    };
    loadSellerHistory();
  }, []);

  // ONLY this seller's receipts, completed sales only (cancelled / refunded are left out)
  const myReceipts = useMemo(() => {
    if (!mine) return [];
    const me = mine.toLowerCase();
    return receipts.filter((r) => {
      if (!r.createdAt) return false;
      if (r.status && r.status !== 'completed') return false;
      if (r.laybuy?.status === 'cancelled') return false;
      const owner = (r.seller || sellerByDate[sellerDateKey(r.createdAt)] || '').trim().toLowerCase();
      return owner === me;
    });
  }, [receipts, sellerByDate, mine]);

  // one row per week this seller sold something
  const weekHistory = useMemo(() => {
    const map = new Map<string, WeekSummary>();
    myReceipts.forEach((r) => {
      const start = startOfWeek(new Date(r.createdAt as string));
      const key = keyOf(start);
      let w = map.get(key);
      if (!w) {
        w = { start, normalCount: 0, normalTotal: 0, laybuyCount: 0, laybuyTotal: 0, collected: 0 };
        map.set(key, w);
      }
      if (r.saleType === 'laybuy') {
        w.laybuyCount += 1;
        w.laybuyTotal += r.total;
        w.collected += r.cashPaid;
      } else {
        w.normalCount += 1;
        w.normalTotal += r.total;
        w.collected += r.total;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.start.getTime() - a.start.getTime());
  }, [myReceipts]);

  // everything for the selected week
  const weekData = useMemo(() => {
    const startKey = keyOf(weekStart);
    const endKey = keyOf(addDays(weekStart, 6));

    const inWeek = myReceipts
      .filter((r) => {
        const k = localDateKey(r.createdAt);
        return k >= startKey && k <= endKey;
      })
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return { key: keyOf(date), date, normalCount: 0, normalTotal: 0, laybuyCount: 0, laybuyTotal: 0 };
    });
    const dayIndex = new Map(days.map((d, i) => [d.key, i]));

    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    let normalCount = 0;
    let normalTotal = 0;
    let laybuyCount = 0;
    let laybuyTotal = 0;
    let laybuyCollected = 0;
    let laybuyOutstanding = 0;
    let itemsSold = 0;

    inWeek.forEach((r) => {
      const isLay = r.saleType === 'laybuy';
      const day = days[dayIndex.get(localDateKey(r.createdAt)) ?? 0];

      if (isLay) {
        laybuyCount += 1;
        laybuyTotal += r.total;
        laybuyCollected += r.cashPaid;
        if (r.laybuy && r.laybuy.status !== 'completed') laybuyOutstanding += r.laybuy.balanceRemaining;
        day.laybuyCount += 1;
        day.laybuyTotal += r.total;
      } else {
        normalCount += 1;
        normalTotal += r.total;
        day.normalCount += 1;
        day.normalTotal += r.total;
      }

      (r.items || []).forEach((item) => {
        itemsSold += item.quantity;
        const key = item.name.trim().toLowerCase();
        const entry = itemMap.get(key) || { name: item.name.trim(), quantity: 0, revenue: 0 };
        entry.quantity += item.quantity;
        entry.revenue += item.totalPrice;
        itemMap.set(key, entry);
      });
    });

    return {
      receipts: inWeek,
      days,
      items: Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue),
      normalCount,
      normalTotal,
      laybuyCount,
      laybuyTotal,
      laybuyCollected,
      laybuyOutstanding,
      itemsSold,
      totalSales: normalTotal + laybuyTotal,
      collected: normalTotal + laybuyCollected,
    };
  }, [myReceipts, weekStart]);

  const thisWeekStart = startOfWeek(new Date());
  const isCurrentWeek = keyOf(weekStart) === keyOf(thisWeekStart);

  const goPrev = () => setWeekStart((w) => addDays(w, -7));
  const goNext = () => setWeekStart((w) => (keyOf(w) >= keyOf(thisWeekStart) ? w : addDays(w, 7)));
  const goThisWeek = () => setWeekStart(thisWeekStart);
  const jumpToDate = (value: string) => {
    if (!value) return;
    const picked = new Date(`${value}T00:00:00`);
    if (isNaN(picked.getTime())) return;
    setWeekStart(startOfWeek(picked));
  };

  const formatTime = (dateString?: string) =>
    dateString
      ? new Date(dateString).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

  if (loading || identity === 'checking') {
    return (
      <div className={styles.loadingContainer}>
        <ClipLoader size={50} color="#6366f1" />
        <p>Loading your sales...</p>
      </div>
    );
  }

  // NEW: the server said this seller name is no longer allowed on the account
  if (identity === 'unauthorized') {
    return (
      <div className={styles.cover}>
        <h2 className={styles.pageTitle}>My Sales Performance</h2>
        <div className={styles.notice}>
          Your seller name is no longer authorized on this account. Ask the admin to add or reactivate you.
        </div>
      </div>
    );
  }

  if (!mine) {
    return (
      <div className={styles.cover}>
        <h2 className={styles.pageTitle}>My Sales Performance</h2>
        <div className={styles.notice}>
          No seller name found. Log in with your seller name to see your sales.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cover}>
      <div className={styles.header}>
        <h2 className={styles.pageTitle}>My Sales Performance</h2>
        <span className={styles.sellerTag}>Seller: {mine}</span>
      </div>

      {resolvingSellers && (
        <div className={styles.notice}>Matching receipts to sellers…</div>
      )}

      {/* week navigation */}
      <div className={styles.weekNav}>
        <button className={styles.navButton} onClick={goPrev}>‹ Previous</button>
        <div className={styles.weekLabelWrap}>
          <span className={styles.weekLabel}>{weekLabel(weekStart)}</span>
          {isCurrentWeek && <span className={styles.currentTag}>This week</span>}
        </div>
        <button className={styles.navButton} onClick={goNext} disabled={isCurrentWeek}>Next ›</button>
        {!isCurrentWeek && (
          <button className={styles.navButton} onClick={goThisWeek}>This week</button>
        )}
        <label className={styles.jumpLabel}>
          Jump to
          <input
            type="date"
            value={keyOf(weekStart)}
            max={keyOf(new Date())}
            onChange={(e) => jumpToDate(e.target.value)}
            className={styles.dateInput}
          />
        </label>
      </div>

      {/* week summary */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{money(weekData.totalSales)}</span>
          <span className={styles.summaryLabel}>Total sales (normal + full lay-buy value)</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{money(weekData.collected)}</span>
          <span className={styles.summaryLabel}>Collected so far</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{money(weekData.normalTotal)}</span>
          <span className={styles.summaryLabel}>Normal sales ({weekData.normalCount})</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{money(weekData.laybuyTotal)}</span>
          <span className={styles.summaryLabel}>Lay-buys ({weekData.laybuyCount})</span>
        </div>
        {weekData.laybuyOutstanding > 0 && (
          <div className={`${styles.summaryCard} ${styles.summaryCardWarn}`}>
            <span className={styles.summaryValue}>{money(weekData.laybuyOutstanding)}</span>
            <span className={styles.summaryLabel}>Lay-buy still outstanding</span>
          </div>
        )}
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{weekData.itemsSold}</span>
          <span className={styles.summaryLabel}>Items sold</span>
        </div>
      </div>

      {weekData.receipts.length === 0 ? (
        <div className={styles.empty}>
          <h3>No sales this week</h3>
          <p>Nothing recorded under {mine} for {weekLabel(weekStart)}.</p>
        </div>
      ) : (
        <>
          {/* day by day */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Day by day</h4>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Normal sales</th>
                    <th>Normal total</th>
                    <th>Lay-buys</th>
                    <th>Lay-buy total</th>
                    <th>Day total</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.days.map((d) => (
                    <tr key={d.key}>
                      <td>
                        {d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td>{d.normalCount}</td>
                      <td>{money(d.normalTotal)}</td>
                      <td>{d.laybuyCount}</td>
                      <td>{money(d.laybuyTotal)}</td>
                      <td><strong>{money(d.normalTotal + d.laybuyTotal)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* items sold */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Items sold this week</h4>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.items.map((it) => (
                    <tr key={it.name}>
                      <td>{it.name}</td>
                      <td>{it.quantity}</td>
                      <td>{money(it.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* every receipt */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Receipts ({weekData.receipts.length})</h4>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.receipts.map((r) => {
                    const isLay = r.saleType === 'laybuy';
                    return (
                      <tr key={r._id}>
                        <td>{r.receiptsNumber || r._id.slice(-6)}</td>
                        <td>{formatTime(r.createdAt)}</td>
                        <td>
                          <span className={`${styles.badge} ${isLay ? styles.badgeLaybuy : styles.badgeNormal}`}>
                            {isLay ? 'Lay-buy' : 'Normal'}
                          </span>
                        </td>
                        <td className={styles.itemsCell}>
                          {(r.items || []).map((i) => `${i.name} x${i.quantity}`).join(', ')}
                        </td>
                        <td>{money(r.total)}</td>
                        <td>{money(isLay ? r.cashPaid : r.total)}</td>
                        <td>
                          {isLay && r.laybuy
                            ? r.laybuy.status === 'completed'
                              ? 'Paid in full'
                              : money(r.laybuy.balanceRemaining)
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* every week at a glance — click a row to open that week */}
      {weekHistory.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>All weeks</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Normal</th>
                  <th>Lay-buys</th>
                  <th>Total sales</th>
                  <th>Collected</th>
                </tr>
              </thead>
              <tbody>
                {weekHistory.map((w) => {
                  const active = keyOf(w.start) === keyOf(weekStart);
                  return (
                    <tr
                      key={keyOf(w.start)}
                      className={`${styles.rowClickable} ${active ? styles.rowActive : ''}`}
                      onClick={() => setWeekStart(w.start)}
                    >
                      <td>{weekLabel(w.start)}</td>
                      <td>{w.normalCount} · {money(w.normalTotal)}</td>
                      <td>{w.laybuyCount} · {money(w.laybuyTotal)}</td>
                      <td><strong>{money(w.normalTotal + w.laybuyTotal)}</strong></td>
                      <td>{money(w.collected)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellersPerformance;