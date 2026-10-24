// PaymentMethodModal.tsx
import React, { useState } from 'react';
import styles from './PaymentMethodModal.module.css';

// NEW: who the lay-buy is for. Used only to find the lay-buy later; never displayed.
interface LaybuyCustomer {
  name: string;
  idNumber: string;
  phone: string;
}

interface PaymentMethodModalProps {
  // second arg carries lay-buy specific details (due date + customer)
  onSelect: (method: string, details?: { dueDate?: string; customer?: LaybuyCustomer }) => void;
  onClose: () => void;
}

const PAYMENT_METHODS = ['Cash', 'Swiped', 'Orange Money', 'MyZaka', 'Other'];

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ onSelect, onClose }) => {
  // when true, we're on the "pick a due date" step instead of the method list
  const [showLaybuyStep, setShowLaybuyStep] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [dueDateError, setDueDateError] = useState<string | null>(null);

  // NEW: customer details for finding this lay-buy later (at least one is required)
  const [customerName, setCustomerName] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerError, setCustomerError] = useState<string | null>(null);

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

    // NEW: at least one way to find this customer again
    const name = customerName.trim();
    const idNumber = customerId.trim();
    const phone = customerPhone.trim();

    if (!name && !idNumber && !phone) {
      setCustomerError("Enter the customer's name, ID/passport number or phone number");
      return;
    }
    if (phone && phone.replace(/\D/g, '').length < 7) {
      setCustomerError('The phone number looks too short');
      return;
    }

    setCustomerError(null);
    onSelect('Lay-buy', { dueDate, customer: { name, idNumber, phone } });
  };

  const handleBack = () => {
    setShowLaybuyStep(false);
    setDueDate('');
    setDueDateError(null);
    // NEW: don't keep customer details around when going back
    setCustomerName('');
    setCustomerId('');
    setCustomerPhone('');
    setCustomerError(null);
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
              {/* Lay-buy option */}
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
          // Lay-buy step: due date + customer details
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

              {/* NEW: customer details, used only to find this lay-buy later */}
              <label className={styles.fieldLabel} style={{ marginTop: '12px', display: 'block' }}>
                Customer (fill in at least one)
              </label>
              <div className={styles.customerFields}>
                <input
                  type="text"
                  className={styles.dateInput}
                  placeholder="Customer name"
                  value={customerName}
                  autoComplete="off"
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerError(null);
                  }}
                />
                <input
                  type="text"
                  className={styles.dateInput}
                  placeholder="ID or passport number"
                  value={customerId}
                  autoComplete="off"
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setCustomerError(null);
                  }}
                />
                <input
                  type="tel"
                  inputMode="tel"
                  className={styles.dateInput}
                  placeholder="Phone number"
                  value={customerPhone}
                  autoComplete="off"
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setCustomerError(null);
                  }}
                />
              </div>
              <p className={styles.fieldHint}>
                Only used to find this lay-buy when the customer comes to pay. It is never shown on receipts.
              </p>
              {customerError && <p className={styles.fieldError}>{customerError}</p>}
            </div>
            <div className={styles.options}>
              <button className={styles.optionButton} onClick={handleConfirmLaybuy}>
                Confirm Lay-buy
              </button>
            </div>
            <button className={styles.cancelButton} onClick={handleBack}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodModal;