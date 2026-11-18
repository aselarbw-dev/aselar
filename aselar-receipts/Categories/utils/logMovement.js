const StockMovement = require('../models/StockMovement');

// Fire-and-forget: a logging failure must never block a sale or an upload.
function logMovement(entry) {
  return StockMovement.create(entry).catch((err) => {
    console.error('[StockMovement] log failed:', err.message);
  });
}

// For many rows at once (bulk import, deletes)
function logMovements(entries) {
  if (!entries || !entries.length) return Promise.resolve();
  return StockMovement.insertMany(entries, { ordered: false }).catch((err) => {
    console.error('[StockMovement] bulk log failed:', err.message);
  });
}

module.exports = { logMovement, logMovements };