const Joi = require("joi");

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation error",
        details: error.details[0].message,
      });
    }
    next();
  };
};

// Validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid("super_admin", "admin", "worker").required(),
    stationId: Joi.string()
      .pattern(/^STA\d{3}$/)
      .optional(),
  }),

  station: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    location: Joi.string().min(2).max(100).required(),
  }),

  voter: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    stationId: Joi.string()
      .pattern(/^STA\d{3}$/)
      .required(),
  }),

  result: Joi.object({
    stationId: Joi.string()
      .pattern(/^STA\d{3}$/)
      .required(),
    candidateAVotes: Joi.number().integer().min(0).required(),
    candidateBVotes: Joi.number().integer().min(0).required(),
  }),
};

module.exports = { validateRequest, schemas };
