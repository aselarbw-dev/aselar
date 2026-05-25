import React,{useState} from 'react';
import styles from './NumberPad.module.css';

interface NumberPadProps {
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  title:string;
}

const NumberPad: React.FC<NumberPadProps> = ({ onClose, onConfirm }) => {
  const [quantity, setQuantity] = useState<string>('');

  const handleNumberClick = (num: string) => {
    setQuantity((prev) => prev + num);
  };

  const handleConfirm = () => {
    onConfirm(Number(quantity));
    onClose();
  };

  return (
    <div className={styles.numberPadOverlay}>
      <div className={styles.numberPad}>
        <div className={styles.display}>{quantity}</div>
        <div className={styles.buttons}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((num) => (
            <button key={num} onClick={() => handleNumberClick(num)} className={styles.numberButtons}>
              {num}
            </button>
          ))}
          <button onClick={handleConfirm} className={styles.confirm}>Confirm</button>
          <button onClick={onClose} className={styles.cancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default NumberPad;