
  // src/types/Expense.ts
export interface Expense {
  id: string; // Change to string if using MongoDB _id
  name: string;
  amount: number;
  createdAt: string; // Date as a string (ISO format)
}
 export interface returnsProps {
    id:string,
  category:string,
  price:number,
  quantity:string,
  unit:string,
  createdAt:string
}