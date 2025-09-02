const express = require("express");
const multer = require("multer");
const voterController = require("../controllers/voterController");
const { authenticateToken, requireRole } = require("../middlewares/auth");
const { validateRequest } = require("../middlewares/validation");
const { voterSchemas } = require("../middlewares/voterValidation");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    // Accept CSV, PDF, and DOC files
    const allowedTypes = [
      "text/csv",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV, PDF, and Word documents are allowed"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Public verification endpoint (for voting staff)
router.post(
  "/verify",
  authenticateToken,
  validateRequest(voterSchemas.verify),
  voterController.verify
);

// Mark voter as voted (for voting staff)
router.post(
  "/mark-voted",
  authenticateToken,
  validateRequest(voterSchemas.markAsVoted),
  voterController.markAsVoted
);

// Get voters by station (staff can see their station, admins can specify station)
router.get("/station", authenticateToken, voterController.getByStation);

// Get voting statistics
router.get("/stats", authenticateToken, voterController.getVotingStats);

// Admin-only routes
// Get all voters (admin/super_admin only)
router.get(
  "/",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  voterController.getAllVoters
);

// Get voter by ID (admin/super_admin only)
router.get(
  "/:id",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  voterController.getVoterById
);

// Create new voter (admin/super_admin only)
router.post(
  "/create",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  validateRequest(voterSchemas.createVoter),
  voterController.createVoter
);

// Update voter (admin/super_admin only)
router.put(
  "/:id",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  validateRequest(voterSchemas.updateVoter),
  voterController.updateVoter
);

// Delete voter (super_admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["super_admin"]),
  voterController.deleteVoter
);

// Import routes (admin/super_admin only)
router.post(
  "/import/csv",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  upload.single("csv"),
  voterController.importCSV
);

router.post(
  "/import/pdf",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  upload.single("pdf"),
  voterController.importPDF
);

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Maximum size is 10MB" });
    }
  } else if (
    error.message === "Only CSV, PDF, and Word documents are allowed"
  ) {
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

module.exports = router;
