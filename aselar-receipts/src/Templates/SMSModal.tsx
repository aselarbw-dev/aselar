import React, { useState } from 'react';
import styles from './SMSModal.module.css';

interface SMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phoneNumber: string) => void;
}

const SMSModal: React.FC<SMSModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [phoneNumber, setPhoneNumber] = useState('');

 
  const handleSubmit = () => {
    // Add country code if missing (Botswana example)
    let formattedNumber = phoneNumber.trim();
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = `+267${formattedNumber.replace(/^0/, '')}`;
    }
    onSubmit(formattedNumber);
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>Enter Phone Number</h3>
        <input
          type="text"
          placeholder="Enter phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
        />
        <button onClick={handleSubmit}>Send SMS</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default SMSModal;