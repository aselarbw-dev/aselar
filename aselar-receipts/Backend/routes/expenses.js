const express=require("express")
const {protect}=require("../middlewares/protect")
const {createExpense,getAllExpenses,submitExpenses,deleteExpense}=require("../controllers/expenses")
const router=express.Router()
router.post("/expenses",protect,createExpense)
router.get("/get-expenses",protect,getAllExpenses)
router.post('/expenses/submit', protect, submitExpenses);
router.delete("/expenses/:id", protect, deleteExpense);
module.exports=router