const express = require("express");
const router = express.Router();

const {
  discoverOpportunities,
  runLaunchPipeline
} = require("../services/launchService");

router.post("/opportunities", async (_req, res) => {
  try {
    const result = await discoverOpportunities();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error discovering launch opportunities:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to find product opportunities"
    });
  }
});

router.post("/run", async (req, res) => {
  try {
    const result = await runLaunchPipeline(req.body || {});
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error running launch pipeline:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to run launch pipeline"
    });
  }
});

module.exports = router;
