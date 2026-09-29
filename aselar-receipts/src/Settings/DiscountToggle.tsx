import React from 'react';
import { useDiscountEnabled } from '../Hooks/useDiscountEnabled';
import styles from './DiscountToggle.module.css';

const DiscountToggle: React.FC = () => {
  const [enabled, setEnabled] = useDiscountEnabled();

  return (
    <div className={styles.wrapper}>
      <div className={styles.text}>
        <span className={styles.title}>Discounts</span>
        <span className={styles.status}>
          {enabled ? 'On — cashiers can apply discounts' : 'Off — discount input is locked'}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle discounts"
        onClick={() => setEnabled(!enabled)}
        className={`${styles.switch} ${enabled ? styles.switchOn : ''}`}
      >
        <span className={styles.knob} />
      </button>
    </div>
  );
};

export default DiscountToggle;