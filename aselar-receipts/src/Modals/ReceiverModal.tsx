import React, { useState } from 'react';
import styles from '../styles/ReceiverModal.module.css';

interface ReceiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  title?: string; // Optional custom title
  inputPlaceholder?: string; // Optional custom placeholder
  submitButtonText?: string; // Optional custom submit button text
  closeButtonText?: string; // Optional custom close button text
}

const ReceiverModal: React.FC<ReceiverModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title = "Enter Receiver's Name",
  inputPlaceholder = "Enter receiver's name",
  submitButtonText = "Submit",
  closeButtonText = "Close",
}) => {
  const [receiverName, setReceiverName] = useState('');

  const handleSubmit = () => {
    onSubmit(receiverName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>{title}</h3>
        <input
          type="text"
          placeholder={inputPlaceholder}
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
        />
        <button onClick={handleSubmit}>{submitButtonText}</button>
        <button onClick={onClose}>{closeButtonText}</button>
      </div>
    </div>
  );
};

export default ReceiverModal;