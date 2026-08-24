// ProcessReturn.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Receipt from '../Receipt/Receipt';
import { useSellerContext } from '../Sellers/SellerNameProvider';
import styles from './ProcessReturn.module.css';

interface OriginalReceiptItem {
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface OriginalReceipt {
  _id: string;
  items: OriginalReceiptItem[];
  subtotal: number;
  vat: number;
  discount: number;
  total: number;
  createdAt: string;
}

// Working cart item — mirrors what Receipt.tsx expects, plus the ids
// needed to actually restock inventory on save
interface ReturnCartItem {
  id: string;
  itemId: string;
  categoryId: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
}

const ProcessReturn: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();
  const { sellerName } = useSellerContext();

  const [originalReceipt, setOriginalReceipt] = useState<OriginalReceipt | null>(null);
  const [cartItems, setCartItems] = useState<ReturnCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const fetchReceipt = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${import.meta.env.VITE_CATEGORY_RECEIPTS_SERVICE_URL}api/receipt/${receiptId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.message || 'Failed to load this receipt.');
          return;
        }

        setOriginalReceipt(data.data);
      } catch (err) {
        console.error('Fetch receipt error:', err);
        setError('Something went wrong loading this receipt.');
      } finally {
        setIsLoading(false);
      }
    };

    if (receiptId) fetchReceipt();
  }, [receiptId]);

  // NOTE: the stored receipt items (from submitReceipt) don't carry
  // categoryId/itemId — only name/quantity/price/totalPrice. Matching
  // them back to real inventory items needs to happen server-side by
  // name lookup, since that data was never saved on the receipt itself.
  // See the matching step inside handleSubmitReturn below.
  useEffect(() => {
    if (originalReceipt) {
      const items: ReturnCartItem[] = originalReceipt.items.map((item, index) => ({
        id: `${index}-${item.name}`,
        itemId: '', // resolved server-side at submit time, see note above
        categoryId: '', // same
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        discount: 0,
      }));
      setCartItems(items);
    }
  }, [originalReceipt]);

  const handleRemoveItem = (itemId: string) => {
    // "Removing" here means marking this item as being returned —
    // remove it from the working cart entirely
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const originalTotal = originalReceipt?.total || 0;
  const newTotal = subtotal + (originalReceipt ? originalReceipt.vat * (subtotal / (originalReceipt.subtotal || 1)) : 0);
  const refundAmount = originalTotal - newTotal;

  const returnedItems = originalReceipt
    ? originalReceipt.items.filter(
        origItem => !cartItems.some(cartItem => cartItem.name === origItem.name)
      )
    : [];

  const handleSubmitReturn = async () => {
    if (returnedItems.length === 0) {
      toast.warning('No items removed — nothing to return.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/returns/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            originalReceiptId: receiptId,
            returnedItems: returnedItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              // categoryId/itemId are resolved server-side by name match
              // against this business's current inventory
            })),
            sellerName,
            reason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || 'Failed to process return.');
        return;
      }

      toast.success(`Return processed. Refund: BWP ${data.refundAmount.toFixed(2)}`);
      navigate('/generative-scanner');
    } catch (err) {
      console.error('Process return error:', err);
      toast.error('Something went wrong processing the return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <p className={styles.loadingText}>Loading receipt...</p>;
  }

  if (error || !originalReceipt) {
    return <p className={styles.errorText}>{error || 'Receipt not found.'}</p>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Process Return</h2>
      <p className={styles.subtitle}>
        Remove any items being returned, then confirm. Inventory will be restocked automatically.
      </p>

      <Receipt
        items={cartItems}
        subtotal={subtotal}
        vat={originalReceipt.vat}
        discount={0}
        total={newTotal}
        cashPaid={0}
        change={0}
        onCashPaidChange={() => {}}
        onRemoveItem={handleRemoveItem}
      />

      {returnedItems.length > 0 && (
        <div className={styles.refundSummary}>
          <p><strong>Items being returned:</strong> {returnedItems.map(i => `${i.name} x${i.quantity}`).join(', ')}</p>
          <p className={styles.refundAmount}>Refund due: BWP {refundAmount.toFixed(2)}</p>
        </div>
      )}

      <textarea
        className={styles.reasonInput}
        placeholder="Reason for return (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <div className={styles.actions}>
        <button
          className={styles.cancelButton}
          onClick={() => navigate('/generative-scanner')}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          className={styles.submitButton}
          onClick={handleSubmitReturn}
          disabled={isSubmitting || returnedItems.length === 0}
        >
          {isSubmitting ? 'Processing...' : 'Confirm Return'}
        </button>
      </div>
    </div>
  );
};

export default ProcessReturn;