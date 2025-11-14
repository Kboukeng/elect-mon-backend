const rateLimit = require("express-rate-limit");

// Rate limiting for public GET endpoints (stations, voters, reports)
const publicGetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for public POST endpoints (report submission)
const publicPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many report submissions from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  publicGetLimiter,
  publicPostLimiter,
};
