import Joi from 'joi';

export const createReportSchema = Joi.object({
  type: Joi.string().required(),
  severity_level: Joi.string().valid('low', 'medium', 'high').required(),
  description: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
});

export const updateReportSchema = Joi.object({
  type: Joi.string(),
  severity_level: Joi.string().valid('low', 'medium', 'high'),
  description: Joi.string(),
});

export const createCommentSchema = Joi.object({
  comment: Joi.string().required(),
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
});

export const createStreetRatingSchema = Joi.object({
  lighting_score: Joi.number().min(1).max(5).optional().allow(null),
  pedestrian_safety_score: Joi.number().min(1).max(5).required(),
  driver_safety_score: Joi.number().min(1).max(5).required(),
  overall_safety_score: Joi.number().min(1).max(5).required(),
  comment: Joi.string().allow('', null).optional(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
});

export const validateSync = (schema: Joi.Schema, data: any) => {
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new Error(error.details.map(d => d.message).join(', '));
  }
  return value;
};
