const express = require("express");
const publicStationController = require("../controllers/publicStationController");

const router = express.Router();

// Public route - no authentication required
router.get("/public", publicStationController.getAllStations);

module.exports = router;
