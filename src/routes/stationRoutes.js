const express = require("express");
const multer = require("multer");
const path = require("path");
const stationController = require("../controllers/stationController");
const { authenticateToken, requireRole } = require("../middlewares/auth");
const { validateRequest, schemas } = require("../middlewares/validation");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  const allowedExtensions = [".csv", ".xlsx", ".xls", ".pdf", ".docx", ".doc"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    allowedTypes.includes(file.mimetype) ||
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only CSV, Excel, PDF, and Word documents are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Standard CRUD routes
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

// Enhanced file import route (supports multiple formats)
router.post(
  "/import",
  authenticateToken,
  requireRole(["super_admin"]),
  upload.single("file"),
  stationController.importFile
);

// Legacy CSV import route (for backward compatibility)
router.post(
  "/import-csv",
  authenticateToken,
  requireRole(["super_admin"]),
  upload.single("csv"),
  stationController.importCSV
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large. Maximum size allowed is 10MB.",
      });
    }
    return res.status(400).json({
      error: `Upload error: ${error.message}`,
    });
  }

  if (error.message.includes("Invalid file type")) {
    return res.status(400).json({
      error: error.message,
    });
  }

  next(error);
});

module.exports = router;
