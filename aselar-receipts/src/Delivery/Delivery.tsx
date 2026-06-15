import React, { useState } from 'react';
import styles from "./Delivery.module.css";
import { toast } from 'react-toastify';
import { useNavigate, Link } from "react-router-dom";

interface DebtProps {
  fullName: string;
  location: string;
  amount: number;
  issuersName: string;
  message: string;
}

const Delivery: React.FC = () => {
  const [debtData, setDebtData] = useState<DebtProps>({
    fullName: '',
    location: '',
    amount: 0,
    issuersName: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDebtData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtData.fullName || !debtData.location || !debtData.amount || !debtData.issuersName || !debtData.message) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch('http://localhost:5012/api/debt-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: "application/json" },
        credentials: 'include',
        body: JSON.stringify(debtData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Debt collection note submitted successfully!");
        navigate("/debt-delivery");
        setDebtData({ fullName: '', location: '', amount: 0, issuersName: '', message: '' });
        console.log("Debt collection note submitted:", result);
      } else {
        const errorData = await response.json();
        setSubmitMessage(`Error: ${errorData.message || 'Submission failed'}`);
      }
    } catch (error) {
      setSubmitMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>

        {submitMessage && (
          <div className={`${styles.message} ${submitMessage.includes('Error') ? styles.error : styles.success}`}>
            {submitMessage}
          </div>
        )}

        {/* Title row — matches Ledger's header row with Save button */}
        <div className={styles.cardHeader}>
          <h4 className={styles.title}>Debt Collection Note</h4>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* Each row: label left, input right — same as Ledger's Debit/Credit label layout */}
          <div className={styles.fieldRow}>
            <label htmlFor="fullName" className={styles.fieldLabel}>Full Name</label>
            <input
              className={styles.fieldInput}
              type="text"
              id="fullName"
              name="fullName"
              value={debtData.fullName}
              onChange={handleInputChange}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className={styles.fieldRow}>
            <label htmlFor="location" className={styles.fieldLabel}>Location</label>
            <input
              className={styles.fieldInput}
              type="text"
              id="location"
              name="location"
              value={debtData.location}
              onChange={handleInputChange}
              placeholder="Enter location"
              required
            />
          </div>

          <div className={styles.fieldRow}>
            <label htmlFor="amount" className={styles.fieldLabel}>Amount</label>
            <input
              className={styles.fieldInput}
              type="number"
              id="amount"
              name="amount"
              value={debtData.amount}
              onChange={handleInputChange}
              placeholder="Enter amount"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className={styles.fieldRow}>
            <label htmlFor="issuersName" className={styles.fieldLabel}>Issuer's Name</label>
            <input
              className={styles.fieldInput}
              type="text"
              id="issuersName"
              name="issuersName"
              value={debtData.issuersName}
              onChange={handleInputChange}
              placeholder="Enter issuer's name"
              required
            />
          </div>

          <div className={styles.fieldRow}>
            <label htmlFor="message" className={styles.fieldLabel}>Message to Client</label>
            <textarea
              className={`${styles.fieldInput} ${styles.textarea}`}
              id="message"
              name="message"
              value={debtData.message}
              onChange={handleInputChange}
              placeholder="Enter message to the client who owes the debt"
              rows={3}
              required
            />
          </div>

          {/* Button row — Submit (blue, matches Ledger's Post), Recent (teal, matches Credit) */}
          <div className={styles.buttonRow}>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnSubmit}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
            <Link to="/debt-delivery" className={styles.btnLink}>
              <button type="button" className={`${styles.btn} ${styles.btnRecent}`}>
                Recent
              </button>
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Delivery;