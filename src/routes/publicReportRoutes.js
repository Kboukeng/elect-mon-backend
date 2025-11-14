const express = require("express");
const publicReportController = require("../controllers/publicReportController");
const {
  publicGetLimiter,
  publicPostLimiter,
} = require("../middlewares/publicRateLimit");

const router = express.Router();

// Public routes - no authentication required
router.get(
  "/public",
  publicGetLimiter,
  publicReportController.getPublicReports
);
router.post(
  "/public",
  publicPostLimiter,
  publicReportController.createPublicReport
);

module.exports = router;
