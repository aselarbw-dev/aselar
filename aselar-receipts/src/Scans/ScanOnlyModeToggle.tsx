// ScanOnlyModeToggle.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext'; // adjust path to match your project
import { toast } from 'react-toastify';
import styles from './ScanOnlyModeToggle.module.css';

const ScanOnlyModeToggle: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const scanOnlyMode = user?.scanOnlyMode ?? false;

  const handleToggle = async () => {
    const newValue = !scanOnlyMode;
    setIsSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_AUTH_SERVICE_URL}api/settings/scan-only-mode`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ scanOnlyMode: newValue }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update setting');
      }

      updateUser({ scanOnlyMode: newValue });
      toast.success(
        newValue
          ? 'Scan-only mode enabled — items can now only be added by scanning a barcode.'
          : 'Scan-only mode disabled — manual item selection is available again.'
      );
    } catch (error) {
      console.error('Toggle scan-only mode error:', error);
      toast.error('Could not update this setting. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.settingRow}>
      <div className={styles.settingInfo}>
        <h3 className={styles.settingTitle}>Scan-Only Mode</h3>
        <p className={styles.settingDescription}>
          
          Manual selection  is disabled.
        </p>
      </div>

      <button
        className={`${styles.toggleSwitch} ${scanOnlyMode ? styles.toggleOn : ''}`}
        onClick={handleToggle}
        disabled={isSaving}
        role="switch"
        aria-checked={scanOnlyMode}
        aria-label="Toggle scan-only "
      >
        <span className={styles.toggleKnob} />
      </button>
    </div>
  );
};

export default ScanOnlyModeToggle;