// Create this file as: src/middlewares/voterValidation.js

const Joi = require("joi");

const validateRequest = (schema) => {
  return (req, res, next) => {
    // Validate body for POST/PUT requests
    if (["POST", "PUT"].includes(req.method)) {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation error",
          details: error.details[0].message,
        });
      }
    }
    // Validate query parameters for GET requests
    else if (req.method === "GET") {
      const { error } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: "Validation error",
          details: error.details[0].message,
        });
      }
    }
    next();
  };
};

// Voter validation schemas
const voterSchemas = {
  verify: Joi.object({
    voterId: Joi.string()
      .pattern(/^VOT\d{3}$/)
      .optional(),
    registrationNumber: Joi.string().min(6).max(10).optional(),
  }).xor("voterId", "registrationNumber"), // Exactly one of these must be provided

  markAsVoted: Joi.object({
    voterId: Joi.string()
      .pattern(/^VOT\d{3}$/)
      .optional(),
    registrationNumber: Joi.string().min(6).max(10).optional(),
  }).xor("voterId", "registrationNumber"),

  createVoter: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    stationId: Joi.string()
      .pattern(/^STA\d{3}$/)
      .required(),
    registrationNumber: Joi.string().min(6).max(10).alphanum().required(),
  }),

  updateVoter: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    stationId: Joi.string()
      .pattern(/^STA\d{3}$/)
      .optional(),
    registrationNumber: Joi.string().min(6).max(10).alphanum().optional(),
  }),

  getByStation: Joi.object({
    station: Joi.string()
      .pattern(/^STA\d{3}$/)
      .optional(),
  }),

  getAllVoters: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    station: Joi.string()
      .pattern(/^STA\d{3}$/)
      .optional(),
    hasVoted: Joi.string().valid("true", "false").optional(),
  }),

  getStats: Joi.object({
    stationId: Joi.string()
      .pattern(/^STA\d{3}$/)
      .optional(),
  }),
};

module.exports = { validateRequest, voterSchemas };
