// BulkImportPanel.tsx
import { useState } from 'react';
import styles from './BulkImportPanel.module.css';
import ReviewTable from './ReviewTable';
type Step = 'upload' | 'review' | 'result';

interface ParsedRow {
  category: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  unit: string;
  expiryDate: string;
  rowIndex: number;
  valid: boolean;
}

interface BulkImportPanelProps {
  onClose: () => void;
  onImportComplete: () => void;  // NEW
}

const BulkImportPanel: React.FC<BulkImportPanelProps> = ({ onClose, onImportComplete }) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
const [commitResults, setCommitResults] = useState<any>(null);
  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setUploadError(null);
    setParsedRows([]);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setUploadError(null); // clear any previous error when a new file is picked
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please choose a CSV or Excel file first.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token'); // adjust to however you store the auth token
//${import.meta.env.VITE_CATEGORIES_SERVICE_URL}
      const response = await fetch(`${import.meta.env.VITE_CATEGORIES_SERVICE_URL}api/bulk/parse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadError(data.message || 'Failed to parse file.');
        return;
      }

      if (data.invalidRows > 0) {
        // Not a hard stop — just let the user know some rows are missing required fields.
        // They'll still see all rows (valid + invalid) in the review step next.
        console.warn(`${data.invalidRows} row(s) missing category or name.`);
      }

      setParsedRows(data.rows);
      setStep('review');
    } catch (error) {
      console.error('Bulk upload error:', error);
      setUploadError('Something went wrong uploading the file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    // BulkImportPanel.tsx — just the wrapping div's className changes
<div className={step === 'review' ? styles.panelWide : styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.title}>Bulk Import Inventory</h2>
        <button className={styles.closeButton} onClick={handleClose}>✕</button>
      </div>

      <div className={styles.stepIndicator}>
        <span className={step === 'upload' ? styles.activeStep : styles.step}>1. Upload</span>
        <span className={step === 'review' ? styles.activeStep : styles.step}>2. Review</span>
        <span className={step === 'result' ? styles.activeStep : styles.step}>3. Done</span>
      </div>

      <div className={styles.panelBody}>
        {step === 'upload' && (
          <div className={styles.uploadStep}>
            <p className={styles.instructions}>
              Upload a CSV or Excel file with your stock. Columns expected: Category, Name,
              Cost Price, Selling Price, Quantity, Unit, Expiry Date.
            </p>

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className={styles.fileInput}
            />

            {file && <p className={styles.fileName}>Selected: {file.name}</p>}

            {uploadError && <p className={styles.errorText}>{uploadError}</p>}

            <button
              className={styles.primaryButton}
              onClick={handleUpload}
              disabled={isUploading || !file}
            >
              {isUploading ? 'Parsing...' : 'Upload & Continue'}
            </button>
          </div>
        )}

        {step === 'review' && (
  <ReviewTable
    parsedRows={parsedRows}
    onCommitSuccess={(results) => {
      setCommitResults(results); // new state you'll add
      setStep('result');
      onImportComplete();  // NEW — tells Redux to refetch categories
    }}
  />
)}

        {step === 'result' && <div>Results summary goes here</div>}
      </div>
    </div>
  );
};

export default BulkImportPanel;