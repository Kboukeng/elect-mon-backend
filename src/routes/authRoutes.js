const express = require("express");
const authController = require("../controllers/authController");
const { authenticateToken, requireRole } = require("../middlewares/auth");
const { validateRequest, schemas } = require("../middlewares/validation");

const router = express.Router();

router.post(
  "/register",
  authenticateToken,
  requireRole(["super_admin"]),
  validateRequest(schemas.register),
  authController.register
);

router.post("/login", authController.login);

router.post("/logout", authenticateToken, authController.logout);

router.get(
  "/profile",
  authenticateToken,
  authController.getProfile
);

router.get(
  "/getUsers",
  authenticateToken,
  requireRole(["super_admin"]),
  authController.getUsers
);

router.get(
    "/user/:id",
    authenticateToken,
    requireRole(["super_admin"]),
    authController.getUserById
    );

router.put(
  "/user/:id",
  authenticateToken,
  requireRole(["super_admin"]),
  validateRequest(schemas.updateUser),
  authController.updateUser
);

router.put(
  "/user-password/:id",
  authenticateToken,
  validateRequest(schemas.updateProfile),
  authController.changePassword
);

router.delete(
  "/user/:id",
  authenticateToken,
  requireRole(["super_admin"]),
  authController.deleteUser
);

module.exports = router;