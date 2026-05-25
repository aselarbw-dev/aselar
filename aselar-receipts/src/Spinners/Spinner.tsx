import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './Spinner.module.css';
//import loader from "../assets/circle-9360_256.gif"
const Spinner: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return ReactDOM.createPortal(
    <div className={styles.overlay}>
      <div className={styles.spinner}>
      
      </div>
    </div>,
    document.body
  );
};

export default Spinner;
