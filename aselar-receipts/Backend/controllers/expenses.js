const Expense =require("../models/expensesModel")
// Create a new expense
const createExpense = async (req, res) => {
    try {
      const { name, amount } = req.body;
      const userId = req.user._id.toString()
      const newExpense = new Expense({ name, amount,userId });
      await newExpense.save();
      res.status(201).json(newExpense);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create expense' });
    }
  };
  // Submit the list of expenses
 // Backend controller for submitting expenses
const submitExpenses = async (req, res) => {
  try {
    const { expenses } = req.body; // Expect an array of expenses
    const userId = req.user._id.toString(); // Get the authenticated user's ID

    // Validate the request body
    if (!Array.isArray(expenses)) {
      return res.status(400).json({ error: 'Expenses must be provided as an array' });
    }

    // Add the userId to each expense (do not include _id)
    const expensesWithUserId = expenses.map((expense) => ({
      name: expense.name,
      amount: expense.amount,
      userId,
    }));

    // Save all expenses to the database
    const savedExpenses = await Expense.insertMany(expensesWithUserId);

    // Calculate the new totalExpenses
    const totalExpenses = savedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Respond with success message and updated totalExpenses
    res.status(200).json({ message: 'Expenses submitted successfully', totalExpenses });
  } catch (error) {
    console.error('Failed to submit expenses:', error);
    res.status(500).json({ error: 'Failed to submit expenses' });
  }
};
  
  // Get all expenses
  const getAllExpenses = async (req, res) => {
    try {
      const userId = req.user._id.toString(); // Get the authenticated user's ID
  
      // Fetch all expenses for the user
      const expenses = await Expense.find({ userId }).sort({ createdAt: -1 });; ;
  
      // Calculate the totalExpenses
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
      // Respond with the list of expenses and totalExpenses
      res.status(200).json({ expenses, totalExpenses });
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  };
  const deleteExpense = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id.toString();
  
      // Find and delete the expense (ensure it belongs to the user)
      const expense = await Expense.findOneAndDelete({ _id: id, userId });
      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }
  
      // Re-fetch total after deletion (optional, but keeps response consistent)
      const remainingExpenses = await Expense.find({ userId }).sort({ createdAt: -1 });
      const totalExpenses = remainingExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
      res.status(200).json({ 
        message: 'Expense deleted successfully', 
        totalExpenses 
      });
    } catch (error) {
      console.error('Failed to delete expense:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  };
  module.exports={
    createExpense,
    getAllExpenses,
    submitExpenses,
    deleteExpense
  }