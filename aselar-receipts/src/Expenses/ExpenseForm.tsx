// src/components/ExpenseForm.tsx
import React, { useState } from 'react';
import { Expense } from '../types/type';
import styles from './ExpenseForm.module.css';
import { ClipLoader } from 'react-spinners';

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void; // Omit id and createdAt
  isAdding: boolean;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpense, isAdding }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense: Omit<Expense, 'id' | 'createdAt'> = {
      name,
      amount: parseFloat(amount),
    };
    onAddExpense(newExpense);
    setName('');
    setAmount('');
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formBig}>
      <div>
        <label htmlFor="name">Expense Name:</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isAdding}
        />
      </div>
      <div>
        <label htmlFor="amount">Amount:</label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="0.01"
          required
          disabled={isAdding}
        />
      </div>
      <button type="submit" disabled={isAdding} className={styles.addExpenseBtn}>
        {isAdding ? <ClipLoader color="#ffffff" size={20} /> : 'Add Expense'}
      </button>
    </form>
  );
};

export default ExpenseForm;