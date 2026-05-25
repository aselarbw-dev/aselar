
const PaySlip = require('../models/payslipModel');


// POST: Save a new payslip
const postPaySlip=( async (req, res) => {
  try {
    const { employeeName, employeeId, basicSalary, vat, deductions, additions, balance } = req.body;

    const newPaySlip = new PaySlip({
      employeeName,
      employeeId,
      basicSalary,
      vat,
      deductions,
      additions,
      balance,
    });

    const savedPaySlip = await newPaySlip.save();
    res.status(201).json(savedPaySlip);
  } catch (error) {
    res.status(500).json({ message: 'Error saving payslip', error: error.message });
  }
});

// GET: Fetch all payslips
const getPaySlips=(async (req, res) => {
  try {
    const paySlips = await PaySlip.find();
    res.status(200).json(paySlips);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payslips', error: error.message });
  }
});
// latest
const getNewlatest=( async (req, res) => {
  try {
    const latestPaySlip = await PaySlip.findOne().sort({ _id: -1 }); // Sort by _id in descending order
    if (!latestPaySlip) {
      return res.status(404).json({ message: 'No payslips found' });
    }
    res.status(200).json(latestPaySlip);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching latest payslip', error: error.message });
  }
});


module.exports = {postPaySlip,getPaySlips,getNewlatest};