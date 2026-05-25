const express = require("express");
const router = express.Router();

const {
  openDrawer,
  closeDrawer,
  getAvailableSerialPorts,
} = require("../controllers/drawer");

router.post("/open-drawer", async (_req, res) => {
  try {
    const message = await openDrawer();
    res.status(200).json({ status: "success", message });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.post("/close-drawer",async (_req, res) => {
  try {
    const message = await closeDrawer();
    res.status(200).json({ status: "success", message });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Optional: for diagnostics/debugging
router.get("/serial-ports", async (_req, res) => {
  try {
    const ports = await getAvailableSerialPorts();
    res.status(200).json({ status: "success", ports });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;
