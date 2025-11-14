const express = require("express");
const authController = require("../controllers/authController");
const { authenticateToken, requireRole } = require("../middlewares/auth");
const { validateRequest, schemas } = require("../middlewares/validation");
const multer = require("multer");
const path = require("path");

const router = express.Router();

router.post(
  "/register",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  validateRequest(schemas.register),
  authController.register
);

router.post("/login", validateRequest(schemas.login), authController.login);

router.post("/logout", authenticateToken, authController.logout);

router.get("/profile", authenticateToken, authController.getProfile);

router.get(
  "/getUsers",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  authController.getUsers
);

router.get(
  "/user/:id",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  authController.getUserById
);

router.put(
  "/user/:id",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  validateRequest(schemas.updateUser),
  authController.updateUser
);

router.put(
  "/user-password/:id",
  authenticateToken,
  requireRole(["super_admin", "admin"]), // Add role requirement for password changes
  validateRequest(schemas.changePassword),
  authController.changePassword
);

router.delete(
  "/user/:id",
  authenticateToken,
  requireRole(["super_admin"]),
  authController.deleteUser
);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "users-" + uniqueSuffix + path.extname(file.originalname));
  },
});

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

// Add this route to your existing routes
router.post(
  "/import",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  upload.single("file"),
  authController.importUsers
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
