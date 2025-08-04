const express = require("express");
const multer = require("multer");
const stationController = require("../controllers/stationController");
const { authenticateToken, requireRole } = require("../middlewares/auth");
const { validateRequest, schemas } = require("../middlewares/validation");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post(
  "/",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  validateRequest(schemas.station),
  stationController.create
);

router.get("/", authenticateToken, stationController.getAll);

router.get("/:id", authenticateToken, stationController.getById);

router.put(
  "/:id",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  validateRequest(schemas.station),
  stationController.update
);

router.delete(
  "/:id",
  authenticateToken,
  requireRole(["super_admin"]),
  stationController.delete
);

router.post(
  "/import",
  authenticateToken,
  requireRole(["super_admin"]),
  upload.single("csv"),
  stationController.importCSV
);

module.exports = router;
