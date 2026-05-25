
  // src/types/Expense.ts
export interface Expense {
  id: string; // Change to string if using MongoDB _id
  name: string;
  amount: number;
  createdAt: string; // Date as a string (ISO format)
}