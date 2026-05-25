const express = require("express");
const { createProduct,getProducts,editProduct,deleteProduct } = require("../controllers/product");
const router = express.Router();
const {protect}=require("../middlewares/protect.js")
router.post("/products-with-scanner",protect,createProduct);
router.get("/products-with-scanner",protect, getProducts);
router.put("/products-with-scanner/:id",protect, editProduct);
router.delete("/products-with-scanner/:id", deleteProduct);
module.exports = router;
