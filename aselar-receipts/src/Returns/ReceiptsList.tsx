// ReceiptsList.tsx
import { useState, useEffect } from 'react';
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

const ReceiptsList: React.FC = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<ReceiptView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
// Add to state
const [summary, setSummary] = useState<{ grossTotal: number; totalRefunded: number; netTotal: number } | null>(null);

// Add a fetch function
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

// Call it alongside fetchReceipts on mount
useEffect(() => {
  fetchReceipts(1);
  fetchSummary();
}, []);
  const fetchReceipts = async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/get-all?page=${page}&limit=15`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to load receipts.');
        return;
      }

      setReceipts(data.data);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (err) {
      console.error('Fetch receipts error:', err);
      setError('Something went wrong loading receipts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts(1);
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

  const handleEditClick = (receiptId: string) => {
    // Navigate to the POS/return screen with the receipt id — the target
    // screen is responsible for loading this receipt's items into the cart
    navigate(`/process-return/${receiptId}`);
  };

  if (isLoading && receipts.length === 0) {
    return <p className={styles.loadingText}>Loading receipts...</p>;
  }

  if (error && receipts.length === 0) {
    return <p className={styles.errorText}>{error}</p>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>All Receipts</h2>
      <p className={styles.subtitle}>Click Edit to process a return on a past receipt</p>

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
                <td colSpan={4} className={styles.noData}>No receipts found.</td>
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