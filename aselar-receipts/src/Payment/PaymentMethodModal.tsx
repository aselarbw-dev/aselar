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

// CHANGED: Pay2Cell and Ewallet added (clients asked for them)
const PAYMENT_METHODS = ['Cash', 'Swiped', 'Orange Money', 'MyZaka', 'Pay2Cell', 'Ewallet', 'Other'];

// NEW: quick-pick lay-buy periods, in months from the date of purchase. Edit freely.
const LAYBUY_PERIODS = [1, 2, 3, 4];

// NEW: key used to remember the default lay-buy period on this device
const DEFAULT_PERIOD_KEY = 'laybuyDefaultMonths';

// NEW: read the saved default period (months) or null if none / invalid
const readDefaultMonths = (): number | null => {
  try {
    const raw = localStorage.getItem(DEFAULT_PERIOD_KEY);
    const n = raw ? Number(raw) : NaN;
    return LAYBUY_PERIODS.includes(n) ? n : null;
  } catch {
    return null;
  }
};

// NEW: local yyyy-mm-dd (NOT toISOString, which can shift the day by timezone)
const toDateInputValue = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// NEW: adds months safely: 31 Jan + 1 month = 28/29 Feb, not 3 Mar
const addMonths = (from: Date, months: number) => {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return d;
};

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ onSelect, onClose }) => {
  // when true, we're on the "pick a due date" step instead of the method list
  const [showLaybuyStep, setShowLaybuyStep] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [dueDateError, setDueDateError] = useState<string | null>(null);

  // NEW: the remembered default period (months), set by the first chip ever tapped
  const [defaultMonths, setDefaultMonths] = useState<number | null>(() => readDefaultMonths());

  // NEW: customer details for finding this lay-buy later (at least one is required)
  const [customerName, setCustomerName] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerError, setCustomerError] = useState<string | null>(null);

  // NEW: the earliest selectable due date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = toDateInputValue(tomorrow);

  const handleLaybuyClick = () => {
    // NEW: pre-fill the due date from the default period, if there is one
    if (defaultMonths) {
      setDueDate(toDateInputValue(addMonths(new Date(), defaultMonths)));
    }
    setShowLaybuyStep(true);
  };

  // NEW: a chip was tapped. The very first tap also becomes the default.
  const handlePeriodPick = (months: number) => {
    setDueDate(toDateInputValue(addMonths(new Date(), months)));
    setDueDateError(null);

    if (defaultMonths === null) {
      try {
        localStorage.setItem(DEFAULT_PERIOD_KEY, String(months));
      } catch {
        // storage unavailable: the pick still works for this lay-buy
      }
      setDefaultMonths(months);
    }
  };

  // NEW: forget the default so the next chip tap sets a new one
  const handleResetDefault = () => {
    try {
      localStorage.removeItem(DEFAULT_PERIOD_KEY);
    } catch {
      // ignore
    }
    setDefaultMonths(null);
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

              {/* NEW: quick-pick periods, counted from today. They just fill the date box below. */}
              <div className={styles.periodRow}>
                {LAYBUY_PERIODS.map((m) => {
                  const value = toDateInputValue(addMonths(new Date(), m));
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`${styles.periodChip} ${dueDate === value ? styles.periodChipActive : ''}`}
                      onClick={() => handlePeriodPick(m)}
                    >
                      {m} {m === 1 ? 'month' : 'months'}
                      {defaultMonths === m ? ' ★' : ''}
                    </button>
                  );
                })}
              </div>

              {/* NEW: shows which period is the default, with a way to reset it */}
              {defaultMonths !== null ? (
                <p className={styles.fieldHint}>
                  ★ Default: {defaultMonths} {defaultMonths === 1 ? 'month' : 'months'}.{' '}
                  <button type="button" className={styles.resetDefault} onClick={handleResetDefault}>
                    Reset default
                  </button>
                </p>
              ) : (
                <p className={styles.fieldHint}>The first period you tap becomes the default.</p>
              )}

              <input
                type="date"
                className={styles.dateInput}
                min={minDate}
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