import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PaySlip.module.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Deduction {
  label: string;
  amount: string;
}

interface Addition {
  label: string;
  amount: string;
}

const PaySlip: React.FC = () => {
  const [basicSalary, setBasicSalary] = useState<string>('');
  const [vat, setVat] = useState<string>('');
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [additions, setAdditions] = useState<Addition[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const navigate = useNavigate();

  // Handle basic salary input
  const handleBasicSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(Number(value)) && Number(value) >= 0) {
      setBasicSalary(value);
    } else {
      toast.error('Basic salary must be a non-negative number.');
    }
  };

  // Handle VAT input
  const handleVatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(Number(value)) && Number(value) >= 0) {
      setVat(value);
    } else {
      toast.error('VAT must be a non-negative number.');
    }
  };

  // Add a new deduction field
  const handleAddDeduction = () => {
    setDeductions([...deductions, { label: '', amount: '' }]);
  };

  // Add a new addition field
  const handleAddAddition = () => {
    setAdditions([...additions, { label: '', amount: '' }]);
  };

  // Handle deduction label change
  const handleDeductionLabelChange = (index: number, value: string) => {
    const updatedDeductions = [...deductions];
    updatedDeductions[index].label = value;
    setDeductions(updatedDeductions);
  };

  // Handle deduction amount change
  const handleDeductionAmountChange = (index: number, value: string) => {
    if (!isNaN(Number(value)) && Number(value) >= 0) {
      const updatedDeductions = [...deductions];
      updatedDeductions[index].amount = value;
      setDeductions(updatedDeductions);
    } else {
      toast.error('Deduction amount must be a non-negative number.');
    }
  };

  // Handle addition label change
  const handleAdditionLabelChange = (index: number, value: string) => {
    const updatedAdditions = [...additions];
    updatedAdditions[index].label = value;
    setAdditions(updatedAdditions);
  };

  // Handle addition amount change
  const handleAdditionAmountChange = (index: number, value: string) => {
    if (!isNaN(Number(value)) && Number(value) >= 0) {
      const updatedAdditions = [...additions];
      updatedAdditions[index].amount = value;
      setAdditions(updatedAdditions);
    } else {
      toast.error('Addition amount must be a non-negative number.');
    }
  };

  // Handle deletion of a deduction
  const handleDeleteDeduction = (index: number) => {
    const updatedDeductions = deductions.filter((_, i) => i !== index);
    setDeductions(updatedDeductions);
  };

  // Handle deletion of an addition
  const handleDeleteAddition = (index: number) => {
    const updatedAdditions = additions.filter((_, i) => i !== index);
    setAdditions(updatedAdditions);
  };

  // Calculate balance whenever basicSalary, vat, deductions, or additions change
  React.useEffect(() => {
    const totalDeductions = deductions.reduce((sum, deduction) => sum + (Number(deduction.amount) || 0), 0);
    const totalAdditions = additions.reduce((sum, addition) => sum + (Number(addition.amount) || 0), 0);
    const calculatedBalance = (Number(basicSalary) || 0) + totalAdditions - totalDeductions - (Number(vat) || 0);
    setBalance(calculatedBalance);
  }, [basicSalary, vat, deductions, additions]);

  // Handle posting the payslip
  const handlePost = async () => {
    const paySlipData = {
      employeeName: (document.getElementById('employeeName') as HTMLInputElement).value,
      employeeId: (document.getElementById('employeeId') as HTMLInputElement).value,
      basicSalary: Number(basicSalary),
      vat: Number(vat),
      deductions: deductions.map((d) => ({ label: d.label, amount: Number(d.amount) })),
      additions: additions.map((a) => ({ label: a.label, amount: Number(a.amount) })),
      balance: balance,
    };

    try {
      const response = await fetch('http://localhost:5002/api/pay-slips', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paySlipData),
      });

      if (response.ok) {
        toast.success('Payslip posted successfully!');
        setBasicSalary('');
        setVat('');
        setDeductions([]);
        setAdditions([]);
        setBalance(0);
        (document.getElementById('employeeName') as HTMLInputElement).value = '';
        (document.getElementById('employeeId') as HTMLInputElement).value = '';
      } else {
        toast.error('Error posting payslip.');
      }
    } catch (error) {
      toast.error('Error posting payslip.');
    }
  };

  // Fetch the latest payslip and navigate to the template
  const handleFetchLatestPaySlip = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/latest-payslip',{
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        navigate('/payslip-template', { state: data });
      } else {
        toast.error('Error fetching latest payslip.');
      }
    } catch (error) {
      toast.error('Error fetching latest payslip.');
    }
  };

  return (
    <div className={styles.paySlipCover}>
      <div className={styles.wrapper}>
        <div className={styles.slip}>
          <div className={styles.mainHeader}>
            <h3 className={styles.paySlipHeader}>PaySlip</h3>
            <div className={styles.name}>
              <label htmlFor="employeeName">Employee Name</label>
              <input type="text" id="employeeName" placeholder="Enter employee or payee's name" />
            </div>
            <div className={styles.empd}>
              <label htmlFor="employeeId">Employee ID</label>
              <input type="text" id="employeeId" placeholder="Enter employee ID or code" />
            </div>
          </div>
          <h4>Salary Breakdown</h4>
          <div className={styles.paySlipBody}>
            <div className={styles.salary}>
              <label htmlFor="basicSalary">Basic Salary</label>
              <input
                type="text"
                id="basicSalary"
                placeholder="Enter employee basic salary"
                value={basicSalary}
                onChange={handleBasicSalaryChange}
              />
            </div>
            <div className={styles.taxation}>
              <label htmlFor="vat">Value Added Tax</label>
              <input
                type="text"
                id="vat"
                placeholder="Enter VAT @ 14% in BW"
                value={vat}
                onChange={handleVatChange}
              />
            </div>
            {/* Deductions */}
            {deductions.map((deduction, index) => (
              <div key={index} className={styles.deduction}>
                <input
                  type="text"
                  placeholder="deducted payments"
                  value={deduction.label}
                  onChange={(e) => handleDeductionLabelChange(index, e.target.value)}
                />
                <input
                  type="text"
                  placeholder="deducted amount"
                  value={deduction.amount}
                  onChange={(e) => handleDeductionAmountChange(index, e.target.value)}
                />
                <span
                  className={styles.deleteButton}
                  onClick={() => handleDeleteDeduction(index)}
                >
                  ×
                </span>
              </div>
            ))}
            {/* Additions */}
            {additions.map((addition, index) => (
              <div key={index} className={styles.addition}>
                <input
                  type="text"
                  placeholder="added payments"
                  value={addition.label}
                  onChange={(e) => handleAdditionLabelChange(index, e.target.value)}
                />
                <input
                  type="text"
                  placeholder="added amount"
                  value={addition.amount}
                  onChange={(e) => handleAdditionAmountChange(index, e.target.value)}
                />
                <span
                  className={styles.deleteButton}
                  onClick={() => handleDeleteAddition(index)}
                >
                  ×
                </span>
              </div>
            ))}
            <div className={styles.paybuttons}>
              <button className={styles.deductions} onClick={handleAddDeduction}>
                Deductions
              </button>
              <button className={styles.additions} onClick={handleAddAddition}>
                Additions
              </button>
              <button className={styles.post} onClick={handlePost}>
                Post
              </button>
              <button className={styles.sendSlip} onClick={handleFetchLatestPaySlip}>
                Send Payslip
              </button>
            </div>
            {/* Display Balance */}
            <div className={styles.balance}>
              <h4>Balance: {balance.toFixed(2)}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaySlip;