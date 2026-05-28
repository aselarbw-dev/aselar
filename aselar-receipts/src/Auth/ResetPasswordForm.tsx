// ResetPasswordForm.tsx
import { useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import styles from './authForms.module.css';
const ResetPasswordForm = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/reset-password/${token}`, { password });
      setMessage(response.data.message);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
      setMessage('');
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Reset Password</h2>
      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <input
            type="password"
            className={styles.formInput}
            placeholder="New password (min 9 chars with _)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={styles.submitButton}>
          Reset Password
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordForm;