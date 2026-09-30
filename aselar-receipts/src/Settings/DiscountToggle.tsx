import React from 'react';
import { useDiscountEnabled } from '../Hooks/useDiscountEnabled';
import styles from './DiscountToggle.module.css';

const DiscountToggle: React.FC = () => {
  const [enabled, setEnabled, loading] = useDiscountEnabled();
  const [saving, setSaving] = React.useState<boolean>(false);

  const handleToggle = async () => { 
    setSaving(true);
    await setEnabled(!enabled);
    setSaving(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.text}>
        <span className={styles.title}>Discounts</span>
        <span className={styles.status}>
          {loading
            ? 'Loading...'
            : enabled
            ? 'On — cashiers can apply discounts'
            : 'Off — discount input is locked'}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle discounts"
        onClick={handleToggle}
        disabled={loading || saving}
        className={`${styles.switch} ${enabled ? styles.switchOn : ''}`}
      >
        <span className={styles.knob} />
      </button>
    </div>
  );
};

export default DiscountToggle;