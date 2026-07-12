import React, { useRef } from 'react';
import styles from './Receipt.module.css';

interface ReceiptItem {
  id: string; // Added for item removal functionality
  name: string;
  quantity: number;
  price: number;
  discount?: number; // Optional discount amount for each item
}

interface ReceiptProps {
  items: ReceiptItem[];
  subtotal: number;
  vat: number; // For 14% VAT
  discount: number; // Total discount amount
  total: number;
  cashPaid: number;
  change: number;
  onCashPaidChange: (amount: number) => void;
  onRemoveItem: (itemId: string) => void; // For removing items
  onItemDiscount?: (itemId: string) => void; // For applying item discounts
  onApplyGlobalDiscount?: (percent: number) => void; // For global discount
}

const Receipt: React.FC<ReceiptProps> = ({ 
  items, 
  subtotal,
  vat,
  discount,
  total, 
  cashPaid, 
  change, 
  onCashPaidChange,
  onRemoveItem,
  onItemDiscount,
  onApplyGlobalDiscount
}) => {
  const [discountPercent, setDiscountPercent] = React.useState<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle discount percentage change
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(100, Math.max(0, Number(e.target.value) || 0));
    setDiscountPercent(value); // updates instantly, input stays responsive

    // Clear any pending update so we don't fire multiple times while typing
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only push to parent (triggers full POS tree re-render) after typing pauses
    debounceRef.current = setTimeout(() => {
      if (onApplyGlobalDiscount) {
        onApplyGlobalDiscount(value);
      }
    }, 400);
  };

  return (
    <div className={styles.receipt}>
      <h3>Receipt</h3>
      <div className={styles.items}>
        {items.length === 0 ? (
          <div className={styles.emptyMessage}>No items added</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemDetails}>
                <span>{item.name} x {item.quantity}</span>
                <div className={styles.itemActions}>
                  {/* Remove item button */}
                  <button 
                    className={styles.removeButton} 
                    onClick={() => onRemoveItem(item.id)}
                    title="Remove item"
                  >
                    X
                  </button>
                  
                  {/* Discount button - only show if onItemDiscount is provided */}
                  {onItemDiscount && (
                    <button 
                      className={styles.discountButton}
                      onClick={() => onItemDiscount(item.id)}
                      title="Apply discount"
                    >
                      %
                    </button>
                  )}
                </div>
              </div>
              
              <div className={styles.itemPrice}>
                {/* Show original price if there's a discount */}
                {item.discount && item.discount > 0 ? (
                  <>
                    <span className={styles.originalPrice}>
                      Bwp {(item.quantity * item.price).toFixed(2)}
                    </span>
                    <span className={styles.discountedPrice}>
                      Bwp {(item.quantity * item.price - item.discount).toFixed(2)}
                    </span>
                    <span className={styles.discountAmount}>
                      (-{item.discount.toFixed(2)})
                    </span>
                  </>
                ) : (
                  <span>Bwp {(item.quantity * item.price).toFixed(2)}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Subtotal:</span>
          <span>Bwp {subtotal.toFixed(2)}</span>
        </div>
        
        {/* Only show discount section if enabled */}
        {onApplyGlobalDiscount && (
          <div className={styles.discountSection}>
            <div className={styles.discountInputRow}>
              <label>Discount %:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={handleDiscountChange}
                className={styles.discountInput}
              />
            </div>
            
            {discount > 0 && (
              <div className={styles.totalRow}>
                <span>Discount Amount:</span>
                <span>- Bwp {discount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
        
        <div className={styles.totalRow}>
          <span>VAT (14%):</span>
          <span>Bwp {vat.toFixed(2)}</span>
        </div>
        
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>Total:</span>
          <span>Bwp {total.toFixed(2)}</span>
        </div>
        
        <div className={styles.totalRow}>
          <label>Cash Paid:</label>
          <input
            type="number"
            value={cashPaid}
            onChange={(e) => onCashPaidChange(Number(e.target.value))}
            className={styles.cashInput}
          />
        </div>
        
        <div className={`${styles.totalRow} ${styles.change}`}>
          <span>Change:</span>
          <span>Bwp {change.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default Receipt;