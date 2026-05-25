import React, { useState } from 'react';
import styles from './ReceiverModal.module.css';

interface ReceiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

const ReceiverModal: React.FC<ReceiverModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [receiverName, setReceiverName] = useState('');

  const handleSubmit = () => {
    onSubmit(receiverName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <input
          type="text"
          placeholder="Enter receiver's name"
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
        />
        <button onClick={handleSubmit}>Submit</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ReceiverModal;