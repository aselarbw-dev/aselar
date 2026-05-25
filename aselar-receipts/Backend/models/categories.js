// models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  items: [
    {
      name: String,
      costPrice: Number,
      sellingPrice: Number,
      quantity: Number,
    },
  ],
  user: { type: mongoose.Schema.Types.ObjectId, 
    ref: "User", required: true }, // Ensure ownership
},
{
  timestamps:true
}

);

module.exports = mongoose.model('Category', categorySchema);
