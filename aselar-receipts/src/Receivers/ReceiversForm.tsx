import React, { useState } from 'react';
import styles from './ReceiversForm.module.css';
import {toast} from "react-toastify"
interface ReceiverFormProps {
  submitUrl: string;
  onSuccess?: () => void;
}

const ReceiverForm: React.FC<ReceiverFormProps> = ({ submitUrl, onSuccess }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    addressedTo: '',
    email: '',
    phone: '',
    preparedBy: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token=localStorage.getItem('token')
      const res = await fetch(submitUrl, {
        method: 'POST',
        body: JSON.stringify(formData),
        credentials: 'include',
        headers: { "Content-Type": "application/json",
          Accept: "application/json",
          "Authorization": `Bearer ${token}`
        },
        
      });
console.log('Response status:', res.status);
    console.log('Response headers:', res.headers);

     if (!res.ok) {
      const errorText = await res.text();
      console.log('Error response:', errorText);
      setMessage(`Submission failed: ${errorText}`);
      return;
    }
      if (res.ok) {
        setMessage('Submitted successfully.');
        setFormData({ companyName: '', addressedTo: '', email: '', phone: '', preparedBy: '' });
        onSuccess?.();
        toast.success("Receiver information submitted successfully!");
      } else {
        setMessage('Submission failed. Try again.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>Receiver Information</h2>
      <div className={styles.fieldGroup}>
        <label>Company Name</label>
        <input name="companyName" value={formData.companyName} onChange={handleChange} required />
      </div>
      <div className={styles.fieldGroup}>
        <label>Addressed To</label>
        <input name="addressedTo" value={formData.addressedTo} onChange={handleChange} required />
      </div>
      <div className={styles.fieldGroup}>
        <label>Email</label>
        <input name="email" type="email" value={formData.email} onChange={handleChange} required />
      </div>
      <div className={styles.fieldGroup}>
        <label>Phone Number</label>
        <input name="phone" type="tel" value={formData.phone} onChange={handleChange} required />
      </div>
      <div className={styles.fieldGroup}>
        <label>Prepared By</label>
        <input name="preparedBy" value={formData.preparedBy} onChange={handleChange} required />
      </div>

      <button className={styles.submitButton} type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>

      {message && <p className={styles.message}>{message}</p>}
    </form>
  );
};

export default ReceiverForm;
