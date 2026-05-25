// models/Category.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sellingPrice: { type: Number, required: true },
  costPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  expiryDate: { type: Date, required: true },
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String }, // Optional
  products: [productSchema],
  // Precomputed metrics (optional for speed)
  totalCost: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalProfits: { type: Number, default: 0 },
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;