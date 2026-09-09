import { SUPPORTED_CURRENCIES } from '../utility/currencies';
import styles from './CurrencySelector.module.css';

interface CurrencySelectorProps {
  value: string;
  onChange: (code: string) => void;
}

export default function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {SUPPORTED_CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} — {c.name}
        </option>
      ))}
    </select>
  );
}