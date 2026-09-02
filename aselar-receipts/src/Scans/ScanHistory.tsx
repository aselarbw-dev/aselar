// ScanHistory.tsx
import { useState, useEffect } from 'react';
import styles from './ScanHistory.module.css';

interface ScanLogEntry {
  _id: string;
  sellerName: string;
  barcode: string;
  itemName: string;
  paymentMethod: string;
  priceAtScan: number;
  outcome: string;
  createdAt: string;
}

const ScanHistory: React.FC = () => {
  const [logs, setLogs] = useState<ScanLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/bulk/scan-logs?page=${page}&limit=20`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to load scan history.');
        return;
      }

      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (err) {
      console.error('Fetch scan logs error:', err);
      setError('Something went wrong loading scan history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const formatTimestamp = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading && logs.length === 0) {
    return <p className={styles.loadingText}>Loading scan history...</p>;
  }

  if (error && logs.length === 0) {
    return <p className={styles.errorText}>{error}</p>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Scan History</h2>
      <p className={styles.subtitle}>Every barcode scan recorded — item, seller, and time</p>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Barcode</th>
              <th>Price</th>
              <th>Seller</th>
              <th>Payment Method</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.noData}>No scans recorded yet.</td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log._id}>
                  {/* NEW: data-label attrs — used by the mobile stacked-card
                      layout in the CSS to show a label next to each value.
                      No effect on desktop; the table renders exactly as before. */}
                  <td data-label="Item">{log.itemName}</td>
                  <td className={styles.barcodeCell} data-label="Barcode">{log.barcode}</td>
                  <td data-label="Price">BWP {log.priceAtScan.toFixed(2)}</td>
                  <td data-label="Seller">{log.sellerName}</td>
                  <td data-label="Payment Method">{log.paymentMethod}</td>
                  <td data-label="Time">{formatTimestamp(log.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => fetchLogs(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageButton}
          >
            Prev
          </button>
          <span className={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => fetchLogs(currentPage + 1)}
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

export default ScanHistory;