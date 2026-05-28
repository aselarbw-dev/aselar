// ChangePasswordForm.tsx
import { useState } from 'react';
import axios from 'axios';
import styles from './authForms.module.css';
import { useNavigate } from 'react-router-dom';


axios.defaults.withCredentials = true;
const ChangePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate=useNavigate()
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/change-password`, {
        withCredentials: true,
        currentPassword,
        newPassword,
      });
      setMessage(response.data.message);
      setError('');
      navigate("/sign-in")
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
      setMessage('');
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Change Password</h2>
      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <input
            type="password"
            className={styles.formInput}
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <input
            type="password"
            className={styles.formInput}
            placeholder="New password (min 9 chars with _)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={styles.submitButton}>
          Change Password
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;