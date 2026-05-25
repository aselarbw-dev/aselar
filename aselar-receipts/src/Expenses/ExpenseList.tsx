// src/components/ExpenseList.tsx
import React from 'react';
import { Expense } from '../types/type';
import styles from './ExpenseList.module.css';

interface ExpenseListProps {
  expenses: Expense[];
  totalAmount: number;
  onClearList: () => void;
  onSubmitList: () => void;
  isSubmitting: boolean;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  totalAmount,
  onClearList,
  onSubmitList,
  isSubmitting,
}) => {
  return (
    <div className={styles.listContainer}>
      <h2>Total Expenses: Bwp {totalAmount.toFixed(2)}</h2>
      <ul>
        {expenses.map((expense) => (
          <li key={expense.id}>
            <div>
              <strong>{expense.name}</strong>: P{expense.amount.toFixed(2)}
            </div>
            <div>
              <small>{new Date(expense.createdAt).toLocaleString()}</small>
            </div>
          </li>
        ))}
      </ul>
      <div className={styles.buttons}>
        <button onClick={onSubmitList} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit List'}
        </button>
        <button onClick={onClearList} disabled={isSubmitting}>
          Clear List
        </button>
      </div>
    </div>
  );
};

export default ExpenseList;