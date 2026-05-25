const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  barcode: {
    type: Number,
    required: true
   
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
 purchaseDate: {
  type: Date,
  required: true,
},
expiryDate: {
  type: Date,
  required: true,
},
user: { type: mongoose.Schema.Types.ObjectId, 
  ref: "User", required: true }, // Ensure ownership
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
