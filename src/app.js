const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const stationRoutes = require("./routes/stationRoutes");
const voterRoutes = require("./routes/voterRoutes");
const reportRoutes = require("./routes/reportRoutes");
const resultRoutes = require("./routes/resultRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// Public routes (no authentication required)
const publicStationRoutes = require("./routes/publicStationRoutes");
const publicVoterRoutes = require("./routes/publicVoterRoutes");
const publicReportRoutes = require("./routes/publicReportRoutes");

const logger = require("./utils/logger");
const { errorHandler } = require("./middlewares/errorHandler");
const {
  publicGetLimiter,
  publicPostLimiter,
} = require("./middlewares/publicRateLimit");

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Public routes (no authentication required) - must come before authenticated routes
app.use("/api/stations", publicGetLimiter, publicStationRoutes);
app.use("/api/voters", publicGetLimiter, publicVoterRoutes);
app.use("/api/reports", publicReportRoutes);

// Authenticated routes
app.use("/api/auth", authRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/voters", voterRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  logger.info(`Election Monitoring System running on port ${PORT}`);
});

module.exports = app;
