// routes/bulkInventoryRoutes.js
const express = require('express');
const router = express.Router();
const { previewBulkImport,lookupBarcode,getScanLogs,commitBulkImport,parseBulkFile, upload  } = require('../controllers/bulkInventoryController.js');
const { protect } = require('../../Shared/protect.js'); // adjust to your actual auth middleware name/path

router.post('/bulk/preview', protect, previewBulkImport);
router.get('/bulk/lookup-barcode/:code', protect, lookupBarcode);
router.get('/bulk/scan-logs', protect, getScanLogs);
router.post('/bulk/commit', protect, commitBulkImport);
router.post('/bulk/parse', protect,upload.single('file'), parseBulkFile);
module.exports = router;