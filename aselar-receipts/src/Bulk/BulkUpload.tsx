// BulkUpload.tsx
{/*import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { bulkUpload } from '../Store/store'; // Adjust path to your store file
import { RootState, AppDispatch } from '../Store/store'; // Import RootState and AppDispatch
import styles from './BulkUpload.module.css';

const BulkUpload: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const dispatch: AppDispatch = useDispatch(); // Explicitly type dispatch
  const { loading, error } = useSelector((state: RootState) => state.inventory); // Sync with store state
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      // Set error in local state or Redux state as needed
      return;
    }

    try {
      await dispatch(bulkUpload(file)).unwrap();
      onClose(); // Close modal on success
    } catch (err) {
      // Error is already handled by Redux state via rejectWithValue
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Bulk Upload Products</h2>
        <p className={styles.modalInstructions}>
          Upload a CSV, JSON, or Excel file with columns: categoryName (optional), name, sellingPrice, costPrice, quantity, unit, expiryDate.
        </p>
        <input
          type="file"
          accept=".csv,.json,.xlsx,.xls"
          onChange={handleFileChange}
          className={styles.fileInput}
        />
        {error && <p className={styles.errorMessage}>{error}</p>}
        <div className={styles.buttonContainer}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className={styles.uploadButton}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;
*/}