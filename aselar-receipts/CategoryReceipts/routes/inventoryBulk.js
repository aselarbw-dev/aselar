const express = require('express');
const router = express.Router();
const {bulkUpload} = require('../controllers/inventoryController');
const { protect} = require('../../Shared/protect'); // Adjust the path as necessary
router.post('/bulk-upload', bulkUpload);
module.exports=router