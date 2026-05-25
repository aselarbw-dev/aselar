const mongoose = require('mongoose');

const paySlipSchema = new mongoose.Schema({
  employeeName: {
    type: String,
    required: true,
  },
  employeeId: {
    type: String,
    required: true,
  },
  basicSalary: {
    type: Number,
    required: true,
  },
  vat: {
    type: Number,
    required: true,
  },
  deductions: [
    {
      label: {
        type: String,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
    },
  ],
  additions: [
    {
      label: {
        type: String,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
    },
  ],
  balance: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model('PaySlip', paySlipSchema);