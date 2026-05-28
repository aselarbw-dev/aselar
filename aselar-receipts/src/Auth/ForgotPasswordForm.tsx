// ForgotPasswordForm.tsx
import { useState } from 'react';
import axios from 'axios';
import styles from './authForms.module.css';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/forgot-password`, { emailBusiness: email });
      setMessage(response.data.message);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link');
      setMessage('');
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Forgot Password</h2>
      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <input
            type="email"
            className={styles.formInput}
            placeholder="Enter your business email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={styles.submitButton}>
          Send Reset Link
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;