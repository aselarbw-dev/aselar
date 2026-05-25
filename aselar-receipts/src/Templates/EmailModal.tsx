import React, { useState } from 'react';
import Modal from 'react-modal';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    onSubmit(email.trim());
    setLoading(false);
    setEmail('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={{
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '420px',
          padding: '25px',
          borderRadius: '10px',
        },
        overlay: { backgroundColor: 'rgba(0,0,0,0.6)' }
      }}
    >
      <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Send Receipt via Email</h2>
      
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="customer@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '6px',
            marginBottom: '20px'
          }}
          required
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading || !email.trim()}
            style={{
              flex: 1,
              padding: '12px',
              background: '#1e3a8a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EmailModal;