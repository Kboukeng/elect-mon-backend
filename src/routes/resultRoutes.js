const express = require("express");
const resultController = require("../controllers/resultController");
const { authenticateToken, requireRole } = require("../middlewares/auth");
const { validateRequest, schemas } = require("../middlewares/validation");

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  requireRole(["admin", "worker"]),
  validateRequest(schemas.result),
  resultController.submit
);

router.get("/public", resultController.getPublic);

module.exports = router;
