import React, { useState } from 'react';
import styles from "./Delivery.module.css";
import { toast } from 'react-toastify';
import {useNavigate,Link} from "react-router-dom"
interface DebtProps {
  fullName: string;
  location: string;
  amount: number;
  issuersName: string;
  message: string; // Added message field
}

const Delivery: React.FC = () => {
  const [debtData, setDebtData] = useState<DebtProps>({
    fullName: '',
    location: '',
    amount: 0,
    issuersName: '',
    message: '' // Added message field
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const navigate=useNavigate()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDebtData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!debtData.fullName || !debtData.location || !debtData.amount || !debtData.issuersName || !debtData.message){
      toast.error("Please fill in all fields.");
      return; // Added return to prevent submission
    }
    setIsSubmitting(true);
    setSubmitMessage('');
  
    try {
      // Replace with your actual backend endpoint
      const response = await fetch('http://localhost:5012/api/debt-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
           Accept: "application/json",
        },
        credentials: 'include', // Include cookies if needed
        body: JSON.stringify(debtData)
      });

      if (response.ok) {
        const result = await response.json();
        setSubmitMessage(result.message || 'Debt collection note submitted successfully!');
        toast.success("Debt collection note submitted successfully!");
        navigate("/debt-delivery")
        // Reset form
        setDebtData({
          fullName: '',
          location: '',
          amount: 0,
          issuersName: '',
          message: '' // Reset message field
        });
      } else {
        const errorData = await response.json();
        setSubmitMessage(`Error: ${errorData.message || 'Submission failed'}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
          {submitMessage && (
            <div className={`${styles.message} ${submitMessage.includes('Error') ? styles.error : styles.success}`}>
              {submitMessage}
            </div>
          )}
        <h4>Debt Collection Note</h4>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName">Full Name</label>
            <input 
              type="text" 
              id="fullName"
              name="fullName"
              value={debtData.fullName}
              onChange={handleInputChange}
              placeholder='Enter full name' 
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="location">Location</label>
            <input 
              type="text" 
              id="location"
              name="location"
              value={debtData.location}
              onChange={handleInputChange}
              placeholder='Enter location' 
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="amount">Amount</label>
            <input 
              type="number" 
              id="amount"
              name="amount"
              value={debtData.amount}
              onChange={handleInputChange}
              placeholder='Enter amount'
              min="0"
              step="0.01"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="issuersName">Issuers Name</label>
            <input 
              type="text" 
              id="issuersName"
              name="issuersName"
              value={debtData.issuersName}
              onChange={handleInputChange}
              placeholder='Enter issuers name' 
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="message">Message to Client</label>
            <textarea 
              id="message"
              name="message"
              value={debtData.message}
              onChange={handleInputChange}
              placeholder='Enter message to the client who owes the debt'
              rows={4}
              required
            />
          </div>
          
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
          <Link to="/debt-delivery"><button>Recent</button></Link>
        </form>
      </div>
    </div>
  );
};

export default Delivery;