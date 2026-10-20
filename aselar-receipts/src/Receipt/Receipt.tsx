import React, { useRef, useEffect, useState } from 'react';
import styles from './Receipt.module.css';
import { useDiscountEnabled } from '../Hooks/useDiscountEnabled';

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
  vatEnabled?: boolean;
  vat: number; // For 14% VAT
  discount: number; // Total discount amount
  total: number;
  cashPaid: number;
  change: number;
  onCashPaidChange: (amount: number) => void;
  onRemoveItem: (itemId: string) => void; // For removing items
  onItemDiscount?: (itemId: string) => void; // For applying item discounts
  onApplyGlobalDiscount?: (percent: number) => void; // For global discount
  // optional lay-buy props — default behavior is completely unchanged when omitted
  saleType?: 'full' | 'laybuy';
  dueDate?: string | null;
  // NEW: optional override — when omitted, the admin toggle setting is used
  discountEnabled?: boolean;
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
  onApplyGlobalDiscount,
  saleType = 'full',
  dueDate = null,
  discountEnabled,
  vatEnabled = true
}) => {
  // CHANGED: discount input is kept as text so the box can be truly empty (no leading "0")
  const [discountText, setDiscountText] = useState<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLaybuy = saleType === 'laybuy';
  // balance owing for a lay-buy sale (deposit = cashPaid)
  const balanceRemaining = Math.max(total - cashPaid, 0);

  // NEW: cash input is kept as text so the box can be empty; the parent still receives a number
  const [cashText, setCashText] = useState<string>(cashPaid ? String(cashPaid) : '');

  // NEW: if the parent changes cashPaid (e.g. receipt cleared after a sale), resync the text
  useEffect(() => {
    if (Number(cashText || 0) !== cashPaid) {
      setCashText(cashPaid ? String(cashPaid) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashPaid]);

  // NEW: discounts are OFF by default — the admin toggle turns them on
  const [toggleEnabled] = useDiscountEnabled();
  const discountActive = discountEnabled ?? toggleEnabled;

  // NEW: if discounts get switched off while one is applied, reset it so the totals stay honest
  useEffect(() => {
    if (!discountActive && discountText !== '') {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setDiscountText('');
      if (onApplyGlobalDiscount) {
        onApplyGlobalDiscount(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountActive]);

  // Handle discount percentage change
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!discountActive) return; // locked while the toggle is off

    const raw = e.target.value;
    const num = Number(raw) || 0;

    // keep the text as typed, but clamp to 0–100
    let nextText = raw;
    if (raw !== '' && num > 100) nextText = '100';
    else if (raw !== '' && num < 0) nextText = '0';
    setDiscountText(nextText); // updates instantly, input stays responsive

    const value = Math.min(100, Math.max(0, num));

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

  // NEW: cash paid change — text for the box, number for the parent
  const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCashText(raw);
    onCashPaidChange(Number(raw) || 0); // empty / invalid → 0, payload stays a number
  };

  return (
    <div className={styles.receipt}>
      <div className={styles.receiptHeader}>
        <h3>Receipt</h3>
        {/* Lay-buy badge */}
        {isLaybuy && <span className={styles.laybuyBadge}>LAY-BUY</span>}
      </div>
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
                      disabled={!discountActive}
                      title={discountActive ? 'Apply discount' : 'Discounts are turned off'}
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
                value={discountText}
                placeholder="0"
                onChange={handleDiscountChange}
                disabled={!discountActive}
                title={discountActive ? undefined : 'Discounts are turned off'}
                className={styles.discountInput}
              />
            </div>
            {!discountActive && (
              <div className={styles.discountOffHint}>Discounts are turned off</div>
            )}
            
            {discount > 0 && (
              <div className={styles.totalRow}>
                <span>Discount Amount:</span>
                <span>- Bwp {discount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
        
                {vatEnabled && (
          <div className={styles.totalRow}>
            <span>VAT (14%):</span>
            <span>Bwp {vat.toFixed(2)}</span>
          </div>
        )} 
        
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>Total:</span>
          <span>Bwp {total.toFixed(2)}</span>
        </div>
        
        <div className={styles.totalRow}>
          <label>{isLaybuy ? 'Deposit Paid:' : 'Cash Paid:'}</label>
          <input
            type="number"
            value={cashText}
            placeholder="0"
            onChange={handleCashChange}
            className={styles.cashInput}
          />
        </div>
        
        {/* lay-buy shows balance + due date instead of change */}
        {isLaybuy ? (
          <>
            <div className={`${styles.totalRow} ${styles.laybuyBalance}`}>
              <span>Balance Remaining:</span>
              <span>Bwp {balanceRemaining.toFixed(2)}</span>
            </div>
            {dueDate && (
              <div className={styles.totalRow}>
                <span>Due Date:</span>
                <span>{new Date(dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </>
        ) : (
          <div className={`${styles.totalRow} ${styles.change}`}>
            <span>Change:</span>
            <span>Bwp {change.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Receipt;