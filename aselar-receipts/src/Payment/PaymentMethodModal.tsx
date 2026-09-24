// PaymentMethodModal.tsx
import React, { useState } from 'react';
import styles from './PaymentMethodModal.module.css';

interface PaymentMethodModalProps {
  // NEW: second arg carries lay-buy specific details (currently just dueDate)
  onSelect: (method: string, details?: { dueDate?: string }) => void;
  onClose: () => void;
}

const PAYMENT_METHODS = ['Cash', 'Swiped', 'Orange Money', 'MyZaka', 'Other'];

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ onSelect, onClose }) => {
  // NEW: when true, we're on the "pick a due date" step instead of the method list
  const [showLaybuyStep, setShowLaybuyStep] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [dueDateError, setDueDateError] = useState<string | null>(null);

  const handleLaybuyClick = () => {
    setShowLaybuyStep(true);
  };

  const handleConfirmLaybuy = () => {
    if (!dueDate) {
      setDueDateError('Please choose a due date');
      return;
    }

    const chosen = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (chosen <= today) {
      setDueDateError('Due date must be after today');
      return;
    }

    setDueDateError(null);
    onSelect('Lay-buy', { dueDate });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {!showLaybuyStep ? (
          <>
            <h3 className={styles.title}>How did the customer pay?</h3>
            <div className={styles.options}>
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  className={styles.optionButton}
                  onClick={() => onSelect(method)}
                >
                  {method}
                </button>
              ))}
              {/* NEW: Lay-buy option */}
              <button
                className={styles.optionButton}
                onClick={handleLaybuyClick}
              >
                Lay-buy
              </button>
            </div>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
          </>
        ) : (
          // NEW: Lay-buy due date step
          <>
            <h3 className={styles.title}>When is the balance due?</h3>
            <div className={styles.laybuyForm}>
              <label className={styles.fieldLabel}>Due date</label>
              <input
                type="date"
                className={styles.dateInput}
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setDueDateError(null);
                }}
              />
              {dueDateError && <p className={styles.fieldError}>{dueDateError}</p>}
            </div>
            <div className={styles.options}>
              <button className={styles.optionButton} onClick={handleConfirmLaybuy}>
                Confirm Lay-buy
              </button>
            </div>
            <button
              className={styles.cancelButton}
              onClick={() => {
                setShowLaybuyStep(false);
                setDueDate('');
                setDueDateError(null);
              }}
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodModal;