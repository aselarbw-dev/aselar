// ProcessReturn.tsx
import { useState, useEffect, useMemo } from 'react';
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

// NEW: what earlier returns on this receipt already sent back
interface ReturnedSoFar {
  name: string;
  quantity: number;
}

interface OriginalReceipt {
  _id: string;
  items: OriginalReceiptItem[];
  subtotal: number;
  vat: number;
  discount: number;
  total: number;
  createdAt: string;
  returned?: ReturnedSoFar[]; // NEW: missing on older server versions, treated as "nothing returned yet"
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

  // NEW: the lines that can still be returned. Whatever earlier returns already sent back is
  // taken off the receipt lines in order (the same way the server does it), and lines that are
  // completely returned are left out. Each line keeps its own id, so two lines of the same
  // product are never mixed up.
  const returnableLines = useMemo(() => {
    if (!originalReceipt) return [];

    const toConsume = new Map<string, number>();
    (originalReceipt.returned || []).forEach((r) => {
      toConsume.set(r.name, (toConsume.get(r.name) || 0) + r.quantity);
    });

    return originalReceipt.items
      .map((item, index) => {
        let remaining = item.quantity;
        const pending = toConsume.get(item.name) || 0;
        if (pending > 0) {
          const take = Math.min(pending, remaining);
          remaining -= take;
          toConsume.set(item.name, pending - take);
        }
        return {
          id: `${index}-${item.name}`,
          name: item.name,
          quantity: remaining,
          price: item.price,
        };
      })
      .filter((line) => line.quantity > 1e-9);
  }, [originalReceipt]);

  // NOTE: the stored receipt items (from submitReceipt) don't carry
  // categoryId/itemId — only name/quantity/price/totalPrice. Matching
  // them back to real inventory items needs to happen server-side by
  // name lookup, since that data was never saved on the receipt itself.
  // See the matching step inside handleSubmitReturn below.
  useEffect(() => {
    if (originalReceipt) {
      const items: ReturnCartItem[] = returnableLines.map((line) => ({
        id: line.id,
        itemId: '', // resolved server-side at submit time, see note above
        categoryId: '', // same
        name: line.name,
        quantity: line.quantity,
        price: line.price,
        discount: 0,
      }));
      setCartItems(items);
    }
  }, [originalReceipt, returnableLines]);

  const handleRemoveItem = (itemId: string) => {
    // "Removing" here means marking this item as being returned —
    // remove it from the working cart entirely
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const originalSubtotal = originalReceipt?.subtotal || 1;
  const newTotal = subtotal + (originalReceipt ? originalReceipt.vat * (subtotal / originalSubtotal) : 0);

  // CHANGED: the lines being returned are the ones taken out of the cart, found by id (not by name)
  const returnedLines = returnableLines.filter(
    (line) => !cartItems.some((cartItem) => cartItem.id === line.id)
  );
  const returnedSubtotal = returnedLines.reduce((sum, line) => sum + line.quantity * line.price, 0);
  const refundAmount =
    returnedSubtotal + (originalReceipt ? originalReceipt.vat * (returnedSubtotal / originalSubtotal) : 0);

  const handleSubmitReturn = async () => {
    if (returnedLines.length === 0) {
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
            returnedItems: returnedLines.map(line => ({
              name: line.name,
              quantity: line.quantity,
              price: line.price,
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

  // NEW: nothing left to return on this receipt
  if (returnableLines.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Process Return</h2>
        <p className={styles.subtitle}>Every item on this receipt has already been returned.</p>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={() => navigate('/generative-scanner')}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Process Return</h2>
      <p className={styles.subtitle}>
        Remove any items being returned, then confirm. Inventory will be restocked automatically.
        {(originalReceipt.returned?.length ?? 0) > 0 && ' Items already returned earlier are not shown.'}
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

      {returnedLines.length > 0 && (
        <div className={styles.refundSummary}>
          <p><strong>Items being returned:</strong> {returnedLines.map(i => `${i.name} x${i.quantity}`).join(', ')}</p>
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
          disabled={isSubmitting || returnedLines.length === 0}
        >
          {isSubmitting ? 'Processing...' : 'Confirm Return'}
        </button>
      </div>
    </div>
  );
};

export default ProcessReturn;