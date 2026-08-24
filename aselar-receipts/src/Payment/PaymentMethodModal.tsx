// PaymentMethodModal.tsx
import styles from './PaymentMethodModal.module.css';

interface PaymentMethodModalProps {
  onSelect: (method: string) => void;
  onClose: () => void;
}

const PAYMENT_METHODS = ['Cash', 'Swiped', 'Orange Money', 'MyZaka', 'Other'];

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ onSelect, onClose }) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
        </div>
        <button className={styles.cancelButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PaymentMethodModal;