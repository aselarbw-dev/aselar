import React from 'react'
import PaymentConfirmation from './PaymentConfirmation';
const Billing:React.FC = () => {
  const paymentDetails = {
    clientName: "Johnson Ian Banda",
    invoiceNumber: "INV-2023-0456",
    datePaid: "2025-03-26",
    amount: 249.99,
    paymentMethod: "Credit Card (VISA ****4242)",
    service: "Premium Web Design Package"
  };

  return (
    <div>
     <PaymentConfirmation {...paymentDetails} />
    </div>
  )
}

export default Billing
