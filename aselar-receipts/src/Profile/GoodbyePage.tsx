// GoodbyePage.tsx
import { useEffect,useState } from 'react';
import styles from './account.module.css';

const GoodbyePage = () => {
 
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check dark mode
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    
    // Clear data
    localStorage.clear();
    sessionStorage.clear();
  }, []);

  return (
    <div className={`${styles.container} ${styles.goodbyeContainer} ${isDarkMode ? 'dark' : ''}`}>
      <div className={styles.goodbyeEmoji}>👋</div>
      <h1 className={styles.title}>Account Deleted</h1>
      <p className={styles.goodbyeText}>
        We've successfully removed all your data from our systems.
        <br />
        You're always welcome back!
      </p>
      <a href="/" className={styles.homeLink}>
        Return to Home
      </a>
    </div>
  );
};
export default GoodbyePage