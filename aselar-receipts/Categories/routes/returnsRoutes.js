const express = require('express');
const router = express.Router();
const { protect } = require('../../Shared/protect.js'); // adjust to your actual auth middleware name/path  

const {processReturn}=require('../controllers/returnsController.js');
router.post('/returns/process', protect, processReturn);
module.exports = router;