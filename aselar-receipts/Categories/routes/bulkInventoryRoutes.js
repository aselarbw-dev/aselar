// routes/bulkInventoryRoutes.js
const express = require('express');
const router = express.Router();
const { previewBulkImport,commitBulkImport,parseBulkFile, upload  } = require('../controllers/bulkInventoryController.js');
const { protect } = require('../../Shared/protect.js'); // adjust to your actual auth middleware name/path

router.post('/bulk/preview', protect, previewBulkImport);
router.post('/bulk/commit', protect, commitBulkImport);
router.post('/bulk/parse', protect,upload.single('file'), parseBulkFile);
module.exports = router;