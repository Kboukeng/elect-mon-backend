const express = require("express");
const multer = require("multer");
const voterController = require("../controllers/voterController");
const { authenticateToken } = require("../middlewares/auth");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/verify", authenticateToken, voterController.verify);

router.get("/", authenticateToken, voterController.getByStation);

router.post(
  "/import",
  authenticateToken,
  upload.single("csv"),
  voterController.importCSV
);

module.exports = router;
