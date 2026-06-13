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
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeId, setEmployeeId]     = useState<string>('');
  const [basicSalary, setBasicSalary]   = useState<string>('');
  const [vat, setVat]                   = useState<string>('');
  const [deductions, setDeductions]     = useState<Deduction[]>([]);
  const [additions, setAdditions]       = useState<Addition[]>([]);
  const [balance, setBalance]           = useState<number>(0);
  const navigate = useNavigate();

  const handleBasicSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(Number(value)) && Number(value) >= 0) {
      setBasicSalary(value);
    } else {
      toast.error('Basic salary must be a non-negative number.');
    }
  };

  const handleVatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(Number(value)) && Number(value) >= 0) {
      setVat(value);
    } else {
      toast.error('VAT must be a non-negative number.');
    }
  };

  const handleAddDeduction = () => setDeductions([...deductions, { label: '', amount: '' }]);
  const handleAddAddition  = () => setAdditions([...additions,   { label: '', amount: '' }]);

  const handleDeductionLabelChange = (index: number, value: string) => {
    const updated = [...deductions];
    updated[index].label = value;
    setDeductions(updated);
  };

  const handleDeductionAmountChange = (index: number, value: string) => {
    if (!isNaN(Number(value)) && Number(value) >= 0) {
      const updated = [...deductions];
      updated[index].amount = value;
      setDeductions(updated);
    } else {
      toast.error('Deduction amount must be a non-negative number.');
    }
  };

  const handleAdditionLabelChange = (index: number, value: string) => {
    const updated = [...additions];
    updated[index].label = value;
    setAdditions(updated);
  };

  const handleAdditionAmountChange = (index: number, value: string) => {
    if (!isNaN(Number(value)) && Number(value) >= 0) {
      const updated = [...additions];
      updated[index].amount = value;
      setAdditions(updated);
    } else {
      toast.error('Addition amount must be a non-negative number.');
    }
  };

  const handleDeleteDeduction = (index: number) =>
    setDeductions(deductions.filter((_, i) => i !== index));

  const handleDeleteAddition = (index: number) =>
    setAdditions(additions.filter((_, i) => i !== index));

  React.useEffect(() => {
    const totalDeductions = deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const totalAdditions  = additions.reduce((sum, a)  => sum + (Number(a.amount) || 0), 0);
    setBalance((Number(basicSalary) || 0) + totalAdditions - totalDeductions - (Number(vat) || 0));
  }, [basicSalary, vat, deductions, additions]);

  const handlePost = async () => {
    const paySlipData = {
      employeeName,
      employeeId,
      basicSalary: Number(basicSalary),
      vat: Number(vat),
      deductions: deductions.map((d) => ({ label: d.label, amount: Number(d.amount) })),
      additions:  additions.map((a)  => ({ label: a.label, amount: Number(a.amount) })),
      balance,
    };

    try {
      const response = await fetch('http://localhost:5002/api/pay-slips', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paySlipData),
      });

      if (response.ok) {
        toast.success('Payslip posted successfully!');
        setEmployeeName('');
        setEmployeeId('');
        setBasicSalary('');
        setVat('');
        setDeductions([]);
        setAdditions([]);
        setBalance(0);
      } else {
        toast.error('Error posting payslip.');
      }
    } catch {
      toast.error('Error posting payslip.');
    }
  };

  const handleFetchLatestPaySlip = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/latest-payslip', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        navigate('/payslip-template', { state: data });
      } else {
        toast.error('Error fetching latest payslip.');
      }
    } catch {
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
              <input
                type="text"
                id="employeeName"
                placeholder="Enter employee or payee's name"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
              />
            </div>
            <div className={styles.empd}>
              <label htmlFor="employeeId">Employee ID</label>
              <input
                type="text"
                id="employeeId"
                placeholder="Enter employee ID or code"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
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

            {deductions.map((deduction, index) => (
              <div key={index} className={styles.deduction}>
                <input
                  type="text"
                  placeholder="Deduction label"
                  value={deduction.label}
                  onChange={(e) => handleDeductionLabelChange(index, e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Amount"
                  value={deduction.amount}
                  onChange={(e) => handleDeductionAmountChange(index, e.target.value)}
                />
                <span className={styles.deleteButton} onClick={() => handleDeleteDeduction(index)}>×</span>
              </div>
            ))}

            {additions.map((addition, index) => (
              <div key={index} className={styles.addition}>
                <input
                  type="text"
                  placeholder="Addition label"
                  value={addition.label}
                  onChange={(e) => handleAdditionLabelChange(index, e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Amount"
                  value={addition.amount}
                  onChange={(e) => handleAdditionAmountChange(index, e.target.value)}
                />
                <span className={styles.deleteButton} onClick={() => handleDeleteAddition(index)}>×</span>
              </div>
            ))}

            <div className={styles.paybuttons}>
              <button className={styles.deductions} onClick={handleAddDeduction}>Deductions</button>
              <button className={styles.additions}  onClick={handleAddAddition}>Additions</button>
              <button className={styles.post}       onClick={handlePost}>Post</button>
              <button className={styles.sendSlip}   onClick={handleFetchLatestPaySlip}>Send Payslip</button>
            </div>

            <div className={styles.balance}>
              <h4>Balance: BWP {balance.toFixed(2)}</h4>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PaySlip;