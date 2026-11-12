// ReceiptsList.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ReceiptsList.module.css';

interface ReceiptItemView {
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface ReceiptView {
  _id: string;
  items: ReceiptItemView[];
  subtotal: number;
  vat: number;
  discount: number;
  total: number;
  cashPaid: number;
  change: number;
  createdAt: string;
}

const PAGE_SIZE = 15;

const ReceiptsList: React.FC = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<ReceiptView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<{ grossTotal: number; totalRefunded: number; netTotal: number } | null>(null);

  // NEW: filters. The item text is debounced so a search is not sent on every keystroke.
  const [itemSearch, setItemSearch] = useState<string>('');
  const [debouncedItem, setDebouncedItem] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  // NEW: how many receipts match the filters (all pages), straight from the server
  const [totalFound, setTotalFound] = useState<number | null>(null);
  // NEW: the full-screen "Loading..." only shows for the very first load, so the filter
  // boxes stay on screen (and keep focus) while a search is running
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  // NEW: ignore a slow, outdated response when a newer search has already been sent
  const latestRequest = useRef<number>(0);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/receipts-summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) setSummary(data);
    } catch (err) {
      console.error('Fetch summary error:', err);
    }
  };

  // NEW: builds the query string for a page, including the filters.
  // Dates are sent as the start / end of the chosen day in the viewer's own time.
  const buildQuery = (page: number) => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (debouncedItem) params.set('item', debouncedItem);
    if (dateFrom) params.set('startDate', new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) params.set('endDate', new Date(`${dateTo}T23:59:59.999`).toISOString());
    return params.toString();
  };

  const fetchReceipts = async (page: number) => {
    const requestId = ++latestRequest.current;
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/get-all?${buildQuery(page)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      // a newer search was sent while this one was running: drop this answer
      if (requestId !== latestRequest.current) return;

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to load receipts.');
        return;
      }

      setReceipts(data.data);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage);
      setTotalFound(typeof data.total === 'number' ? data.total : null);
      setHasLoaded(true);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      console.error('Fetch receipts error:', err);
      setError('Something went wrong loading receipts.');
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  };

  // Summary only needs loading once
  useEffect(() => {
    fetchSummary();
  }, []);

  // NEW: wait for a short pause in typing before searching by item name
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedItem(itemSearch.trim()), 350);
    return () => clearTimeout(timer);
  }, [itemSearch]);

  // CHANGED: load page 1 on mount and again whenever a filter changes
  useEffect(() => {
    fetchReceipts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedItem, dateFrom, dateTo]);

  const hasFilters = itemSearch.trim() !== '' || dateFrom !== '' || dateTo !== '';

  const clearFilters = () => {
    setItemSearch('');
    setDebouncedItem('');
    setDateFrom('');
    setDateTo('');
  };

  const formatTimestamp = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEditClick = (receiptId: string) => {
    // Navigate to the POS/return screen with the receipt id — the target
    // screen is responsible for loading this receipt's items into the cart
    navigate(`/process-return/${receiptId}`);
  };

  if (isLoading && !hasLoaded) {
    return <p className={styles.loadingText}>Loading receipts...</p>;
  }

  if (error && !hasLoaded) {
    return <p className={styles.errorText}>{error}</p>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>All Receipts</h2>
      <p className={styles.subtitle}>Click Edit to process a return on a past receipt</p>

      {/* NEW: filter by item name and by the date the sale was made */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Item name</label>
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search by item name"
            className={styles.filterInput}
            autoComplete="off"
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Sale date from</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className={styles.filterInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Sale date to</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className={styles.filterInput}
          />
        </div>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className={styles.clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* NEW: how many receipts match, plus a quiet "Searching..." while a new search runs */}
      <p className={styles.resultCount}>
        {isLoading
          ? 'Searching...'
          : totalFound !== null
          ? `${totalFound} receipt${totalFound === 1 ? '' : 's'} found`
          : ''}
      </p>
      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.tableScroll}>
        {summary && (
          <div className={styles.summaryBar}>
            <span>Gross Sales: BWP {summary.grossTotal.toFixed(2)}</span>
            <span className={styles.refundedText}>Refunded: -BWP {summary.totalRefunded.toFixed(2)}</span>
            <span className={styles.netTotal}>Net Sales: BWP {summary.netTotal.toFixed(2)}</span>
          </div>
        )}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.noData}>
                  {hasFilters ? 'No receipts match your filters.' : 'No receipts found.'}
                </td>
              </tr>
            ) : (
              receipts.map(receipt => (
                <tr key={receipt._id}>
                  <td>{formatTimestamp(receipt.createdAt)}</td>
                  <td className={styles.itemsCell}>
                    {receipt.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                  </td>
                  <td>BWP {receipt.total.toFixed(2)}</td>
                  <td>
                    <button
                      className={styles.editButton}
                      onClick={() => handleEditClick(receipt._id)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => fetchReceipts(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageButton}
          >
            Prev
          </button>
          <span className={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => fetchReceipts(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={styles.pageButton}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ReceiptsList;