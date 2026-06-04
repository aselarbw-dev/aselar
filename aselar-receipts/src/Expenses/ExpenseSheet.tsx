// src/components/ExpenseSheet.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setTotalExpenses } from '../Store/store';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import { Expense } from '../types/type';
import styles from './ExpenseSheet.module.css';
import { ClipLoader } from 'react-spinners';

const ExpenseSheet: React.FC = () => {
  const dispatch = useDispatch();
  const [isAdding, setIsAdding] = useState(false); // Loading state for adding an expense
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  // Update Redux state whenever totalAmount changes
  useEffect(() => {
    dispatch(setTotalExpenses(totalAmount));
  }, [totalAmount]);
// Fetch expenses from the backend
const fetchExpenses = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/get-expenses`, {
      credentials: 'include', // For cookie-based auth
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch expenses');
    }

    const data = await response.json();
    dispatch(setTotalExpenses(data.totalExpenses)); // Update totalExpenses in Redux
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
  }
};
  const handleAddExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    setIsAdding(true);
    try {
      const token=localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
         Authorization: `Bearer ${token}`, // For Bearer auth
        },
        body: JSON.stringify(expense),
        credentials: 'include', // For cookie-based auth
      });
      const newExpense = await response.json();
      setExpenses((prevExpenses) => [newExpense, ...prevExpenses]);
      setTotalAmount((prevTotal) => prevTotal + newExpense.amount);
    } catch (error) {
      console.error('Failed to add expense:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClearList = () => {
    setExpenses([]);
    setTotalAmount(0);
  };
  const handleSubmitList = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/expenses/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`, // For Bearer auth
        },
        body: JSON.stringify({ expenses }), // Send the list of expenses
        credentials: 'include', // For cookie-based auth
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit expenses');
      }
  
      const data = await response.json();
      console.log('Backend Response:', data); // Log the response for debugging
  
      // Fetch the updated list of expenses from the backend
      await fetchExpenses();
  
      // Clear the list after successful submission
      setExpenses([]);
      setTotalAmount(0);
    } catch (error:any) {
      console.error('Failed to submit expenses:', error.message || error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.sheetContainer}>
      <h1>Expense Sheet</h1>
      <ExpenseForm onAddExpense={handleAddExpense} isAdding={isAdding} />
      <ExpenseList
        expenses={expenses}
        totalAmount={totalAmount}
        onClearList={handleClearList}
        onSubmitList={handleSubmitList}
        isSubmitting={isSubmitting}
      />
      {isSubmitting && (
        <div className={styles.spinnerOverlay}>
          <ClipLoader color="#36d7b7" size={50} />
          <p>Submitting expenses...</p>
        </div>
      )}
    </div>
  );
};

export default ExpenseSheet;