// DeleteAccountButton.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './account.module.css';

const DeleteAccountButton = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    
    const handler = (e:any) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addListener(handler);
    return () => darkModeMediaQuery.removeListener(handler);
  }, []);

  const handleDelete = async () => {
    if (!window.confirm("This will permanently erase your account. Continue?")) return;

    setIsLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/delete-account`,
         { withCredentials: true });
      navigate('/goodbye');
    } catch (error) {
      alert("Deletion failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${styles.container} ${isDarkMode ? 'dark' : ''}`}>
      <h2 className={styles.title}>Account Settings</h2>
      
      <div className={styles.deleteWarning}>
        <h3>⚠️ Permanent Action</h3>
        <p>This will delete all your data including:</p>
        <ul>
          <li>Business profile</li>
          <li>Associated images</li>
          <li>Account credentials</li>
        </ul>
      </div>

      <button
        onClick={handleDelete}
        disabled={isLoading}
        className={styles.deleteButton}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner}></span>
            Deleting...
          </>
        ) : (
          'Delete Account Permanently'
        )}
      </button>
    </div>
  );
};
export default DeleteAccountButton