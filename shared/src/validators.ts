import Joi from 'joi';

export const createReportSchema = Joi.object({
  type: Joi.string().required(),
  severity_level: Joi.string().valid('low', 'medium', 'high').required(),
  description: Joi.string().pattern(/[a-zA-Z0-9]/).message('Description must contain at least one alphanumeric character').required(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
  photo_url: Joi.string().uri().allow('', null).optional(),
});

export const updateReportSchema = Joi.object({
  type: Joi.string(),
  severity_level: Joi.string().valid('low', 'medium', 'high'),
  description: Joi.string(),
});

export const createCommentSchema = Joi.object({
  comment: Joi.string().pattern(/[a-zA-Z0-9]/).message('Comment must contain at least one alphanumeric character').required(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
});

export const heatmapFilterSchema = Joi.object({
  min_latitude: Joi.number().required(),
  max_latitude: Joi.number().required(),
  min_longitude: Joi.number().required(),
  max_longitude: Joi.number().required(),
  days_back: Joi.number().min(1).max(365).default(30),
  // Use plain .string() here — Joi's built-in .isoDate() only accepts
  // bare date strings (YYYY-MM-DD) and silently rejects full ISO-8601
  // datetimes like "2026-06-07T16:00:00.000Z", causing the dates to be
  // stripped by validateSync and the query to fall back to days_back:30.
  // PostgreSQL's ::timestamptz cast handles both formats natively.
  start_date: Joi.string().optional(),
  end_date: Joi.string().optional(),
});

export const createStreetRatingSchema = Joi.object({
  lighting_score: Joi.number().min(1).max(5).optional().allow(null),
  pedestrian_safety_score: Joi.number().min(1).max(5).required(),
  driver_safety_score: Joi.number().min(1).max(5).required(),
  overall_safety_score: Joi.number().min(1).max(5).required(),
  comment: Joi.string().pattern(/[a-zA-Z0-9]/).message('Comment must contain at least one alphanumeric character').allow('', null).optional(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
  photo_url: Joi.string().uri().allow('', null).optional(),
});

export const registerSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
});

export const validateSync = (schema: Joi.Schema, data: any) => {
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new Error(error.details.map(d => d.message).join(', '));
  }
  return value;
};
