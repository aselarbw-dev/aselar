import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './StockHistory.module.css';

interface Movement {
  _id: string;
  createdAt: string;
  itemId: string;
  itemName: string;
  categoryName: string;
  type: string;
  qtyChange: number;
  balanceBefore: number;
  balanceAfter: number;
  performedBy: string;
  refType: string;
  refId: string;
  note: string;
}

const TYPE_LABELS: Record<string, string> = {
  OPENING: 'Opening',
  BULK_UPLOAD: 'Bulk upload',
  MANUAL_ADD: 'Added',
  RESTOCK_EDIT: 'Restock (edit)',
  SALE: 'Sale',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
  DELETE: 'Deleted',
};

const PAGE_SIZE = 50;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const StockHistory: React.FC = () => {
  const [searchParams] = useSearchParams();
  const itemIdFilter = searchParams.get('itemId') || ''; // lets an item screen link straight here

  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  // wait for the user to stop typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // any filter change goes back to page 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, from, to, itemIdFilter]);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (type) params.set('type', type);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (itemIdFilter) params.set('itemId', itemIdFilter);

      const response = await fetch(
        `${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/stock-movements?${params.toString()}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setMovements(Array.isArray(data.movements) ? data.movements : []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
    } catch (err) {
      console.error('Failed to load stock history:', err);
      setError('Failed to load stock history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, type, from, to, itemIdFilter]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const clearFilters = () => {
    setSearchText('');
    setType('');
    setFrom('');
    setTo('');
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Stock History</h2>
      <p className={styles.subtitle}>
        Every stock change: what came in, what was sold or returned, the balance left, and when.
      </p>

      <div className={styles.filters}>
        <input
          type="text"
          className={styles.input}
          placeholder="Search item name…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select className={styles.input} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className={styles.dateLabel}>
          From
          <input type="date" className={styles.input} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className={styles.dateLabel}>
          To
          <input type="date" className={styles.input} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" className={styles.clearButton} onClick={clearFilters}>
          Clear
        </button>
      </div>

      {itemIdFilter && <p className={styles.itemNotice}>Showing one item only.</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date &amp; time</th>
              <th>Item</th>
              <th>Type</th>
              <th className={styles.num}>Change</th>
              <th className={styles.num}>Balance</th>
              <th>By</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {loading && movements.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && movements.length === 0 && !error && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  No stock movements match these filters.
                </td>
              </tr>
            )}
            {movements.map((m) => (
              <tr key={m._id}>
                <td className={styles.nowrap}>{formatDateTime(m.createdAt)}</td>
                <td>
                  <div className={styles.itemName}>{m.itemName}</div>
                  <div className={styles.category}>{m.categoryName}</div>
                </td>
                <td>
                  <span className={`${styles.badge} ${styles[`type_${m.type}`] || ''}`}>
                    {TYPE_LABELS[m.type] || m.type}
                  </span>
                </td>
                <td className={`${styles.num} ${m.qtyChange >= 0 ? styles.plus : styles.minus}`}>
                  {m.qtyChange > 0 ? `+${m.qtyChange}` : m.qtyChange}
                </td>
                <td className={`${styles.num} ${styles.nowrap}`}>
                  {m.balanceBefore} → <strong>{m.balanceAfter}</strong>
                </td>
                <td>{m.performedBy || '—'}</td>
                <td className={styles.ref} title={m.note || ''}>
                  {m.refId || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages} · {total} movements
        </span>
        <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default StockHistory;