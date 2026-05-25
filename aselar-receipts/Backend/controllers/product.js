//const mongoose = require("mongoose");
const Product = require("../models/productModel");
// Create a new product
const createProduct = async (req, res) => {
  
  try {
  
    const { barcode, name, price, cost, purchaseDate, expiryDate,quantity,category} = req.body;
    if (!req.body.barcode) {
      return res.status(400).json({ message: "QR code is required" });
    }
    
    const newProduct = new Product({
      barcode,
      name,
      price,
      cost,
      quantity,
      category,
      purchaseDate,
      expiryDate,
      user: req.user._id.toString(), // Attach the logged-in user's ID
  
    });

    await newProduct.save();
    res.status(201).json({ message: "Product created successfully", product: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Failed to create product", error });
  }
};
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};
const editProduct = async (req, res) => {
  console.log("PUT Request Received for ID:", req.params.id);
  console.log("Request Body:", req.body); // Log request body

  try {
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id.toString() }, // Ensure user is authorized
      req.body,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
};


const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    const product = await Product.findOne({ _id: id, user: userId });

    if (!product) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    await Product.findByIdAndDelete(id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete product" });
  }
};



module.exports = { createProduct,getProducts,editProduct,deleteProduct};

