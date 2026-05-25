import React from 'react';
import BillingDetails from './BillingDetails';
import styles from './PaymentConfirmation.module.css';

interface PaymentConfirmationProps {
  clientName: string;
  invoiceNumber: string;
  datePaid: string;
  amount: number;
  paymentMethod: string;
  service: string;
}

const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  clientName,
  invoiceNumber,
  datePaid,
  amount,
  paymentMethod,
  service
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Payment Confirmation</h1>
        <div className={styles.successBadge}>Payment Successful</div>
      </div>
      
      <p className={styles.thankYou}>
        Thank you for your payment, {clientName}!
      </p>
      
      <BillingDetails 
        invoiceNumber={invoiceNumber}
        datePaid={datePaid}
        amount={amount}
        paymentMethod={paymentMethod}
        service={service}
      />
      
      <div className={styles.footer}>
        <p>Need help? Contact our support team at support@example.com</p>
      </div>
    </div>
  );
};

export default PaymentConfirmation;