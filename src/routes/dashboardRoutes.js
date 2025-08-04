const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { authenticateToken } = require("../middlewares/auth");

const router = express.Router();

router.get("/summary", authenticateToken, dashboardController.getSummary);

router.get("/realtime", authenticateToken, dashboardController.setupRealtime);

module.exports = router;
