// Taxation/controllers/importController.js
// Request handler for importing lines from a file. The logic lives in services/importService.js.
// req.user is set by the shared protect middleware; the period is looked up for that business only.
//
// The file is sent as the raw request body (see routes.js), and the options travel in the query
// string, for example:
//   POST /api/vat/periods/<id>/import                                  -> a preview (nothing is saved)
//   POST /api/vat/periods/<id>/import?dryRun=false&fileHash=<hash>     -> the import itself

const service = require("../services/importService");
const { ServiceError } = require("../services/periodService");

// Turn a ServiceError into a clean JSON response; anything else goes to the error handler.
const fail = (err, res, next) => {
  if (err instanceof ServiceError) {
    const body = { message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  return next(err);
};

// POST /api/vat/periods/:id/import
const importLines = async (req, res, next) => {
  try {
    // express.raw puts the file in req.body as a Buffer. Anything else means no file arrived.
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const result = await service.importLines({
      business: req.user._id,
      periodId: req.params.id,
      buffer,
      query: req.query,
      userId: req.user._id,
    });
    res.json(result);
  } catch (err) {
    fail(err, res, next);
  }
};

module.exports = { importLines };