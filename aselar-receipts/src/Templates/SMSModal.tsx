import React, { useState } from 'react';
import styles from './SMSModal.module.css';
import { formatPhoneForSMS, SUPPORTED_COUNTRIES, CountryCode } from '../utility/phoneFormat';

interface SMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phoneNumber: string, countryCode: CountryCode) => void; // ← added
  defaultCountry?: CountryCode;
}

const SMSModal: React.FC<SMSModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultCountry = 'BW',
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    try {
      const formattedNumber = formatPhoneForSMS(phoneNumber, country);
      setError(null);
     onSubmit(formattedNumber, country); // ← now passes both
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid phone number');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>Enter Phone Number</h3>

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryCode)}
          className={styles.countrySelect}
        >
          {Object.entries(SUPPORTED_COUNTRIES).map(([code, { name, dialCode }]) => (
            <option key={code} value={code}>
              {name} (+{dialCode})
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Enter phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
        />

        {error && <p className={styles.errorText}>{error}</p>}

        <button onClick={handleSubmit}>Send SMS</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default SMSModal;