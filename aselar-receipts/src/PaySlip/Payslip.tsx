import React from 'react';
import styles from './Payslip.module.css';

interface PayslipProps {
  employeeName: string;
  employeeId: string;
  payPeriod: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
}

const Payslip: React.FC<PayslipProps> = ({
  employeeName,
  employeeId,
  payPeriod,
  basicSalary,
  allowances,
  deductions,
  netSalary,
}) => {
  return (
    <div className={styles.payslipContainer}>
      <header className={styles.header}>
        <h1>Payslip</h1>
        <p>Pay Period: {payPeriod}</p>
      </header>

      <div className={styles.employeeDetails}>
        <p><strong>Employee Name:</strong> {employeeName}</p>
        <p><strong>Employee ID:</strong> {employeeId}</p>
      </div>

      <div className={styles.salaryDetails}>
        <h2>Salary Breakdown</h2>
        <div className={styles.row}>
          <span>Basic Salary</span>
          <span>P {basicSalary.toFixed(2)}</span>
        </div>
        <div className={styles.row}>
          <span>Allowances</span>
          <span>+P {allowances.toFixed(2)}</span>
        </div>
        <div className={styles.row}>
          <span>Deductions</span>
          <span>-P {deductions.toFixed(2)}</span>
        </div>
        <div className={`${styles.row} ${styles.total}`}>
          <span><strong>Net Salary</strong></span>
          <span><strong>Bwp {netSalary.toFixed(2)}</strong></span>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>Thank you for your hard work!</p>
      </footer>
    </div>
  );
};

export default Payslip;
