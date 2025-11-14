const express = require("express");
const publicVoterController = require("../controllers/publicVoterController");

const router = express.Router();

// Public route - no authentication required
router.get("/public", publicVoterController.getPublicVoters);

module.exports = router;
