import React from 'react';
import styles from './BillingDetails.module.css';

interface BillingDetailsProps {
  invoiceNumber: string;
  datePaid: string;
  amount: number;
  paymentMethod: string;
  service: string;
}

const BillingDetails: React.FC<BillingDetailsProps> = ({
  invoiceNumber,
  datePaid,
  amount,
  paymentMethod,
  service
}) => {
  return (
    <div className={styles.detailsContainer}>
      <h2>Billing Details</h2>
      
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Service:</span>
        <span>{service}</span>
      </div>
      
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Invoice Number:</span>
        <span>{invoiceNumber}</span>
      </div>
      
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Date Paid:</span>
        <span>{new Date(datePaid).toLocaleDateString()}</span>
      </div>
      
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Amount:</span>
        <span>Bwp {amount.toFixed(2)}</span>
      </div>
      
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Payment Method:</span>
        <span>{paymentMethod}</span>
      </div>
      
      <div className={styles.actions}>
        <button className={styles.printButton}>Print Receipt</button>
        <button className={styles.downloadButton}>Download PDF</button>
      </div>
    </div>
  );
};

export default BillingDetails;