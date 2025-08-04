const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(`Error ${err.status || 500}: ${err.message}`);

  // Supabase error handling
  if (err.code) {
    switch (err.code) {
      case "23505": // Unique violation
        return res.status(409).json({ error: "Resource already exists" });
      case "23503": // Foreign key violation
        return res.status(400).json({ error: "Referenced resource not found" });
      default:
        return res.status(500).json({ error: "Database error" });
    }
  }

  const status = err.status || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({ error: message });
};

module.exports = { errorHandler };
