const express = require("express");
const reportController = require("../controllers/reportController");
const { authenticateToken } = require("../middlewares/auth");

const router = express.Router();

router.post("/sms", reportController.handleSMS);

router.get(
  "/station/:stationId",
  authenticateToken,
  reportController.getByStation
);

module.exports = router;
