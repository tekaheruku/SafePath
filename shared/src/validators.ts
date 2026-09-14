import Joi from 'joi';

export const createReportSchema = Joi.object({
  incident_type_id: Joi.string().uuid().required(),
  severity_level_id: Joi.string().uuid().required(),
  description: Joi.string().pattern(/[a-zA-Z0-9]/).message('Description must contain at least one alphanumeric character').optional().allow('', null),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
  photo_url: Joi.string().uri({ allowRelative: true }).required().messages({
    'any.required': 'A photo is required to submit a report',
    'string.empty': 'A photo is required to submit a report'
  }),
});

export const updateReportSchema = Joi.object({
  incident_type_id: Joi.string().uuid(),
  severity_level_id: Joi.string().uuid(),
  description: Joi.string().allow('', null),
});

export const createCommentSchema = Joi.object({
  content: Joi.string().allow('', null),
  photo_url: Joi.string().uri({ allowRelative: true }).allow('', null),
}).or('content', 'photo_url');

export const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
});

export const heatmapFilterSchema = Joi.object({
  min_latitude: Joi.number().required(),
  max_latitude: Joi.number().required(),
  min_longitude: Joi.number().required(),
  max_longitude: Joi.number().required(),
  // No default here: the heatmap should show all matching confirmed data by
  // default, same as the individual report/rating pins. A default of 30 here
  // used to silently hide anything older than 30 days from the heatmap only,
  // making it look empty/broken even when reports existed and displayed fine
  // as pins.
  days_back: Joi.number().min(1).max(365).optional(),
  // Use plain .string() here — Joi's built-in .isoDate() only accepts
  // bare date strings (YYYY-MM-DD) and silently rejects full ISO-8601
  // datetimes like "2026-06-07T16:00:00.000Z", causing the dates to be
  // stripped by validateSync and the query to fall back to days_back:30.
  // PostgreSQL's ::timestamptz cast handles both formats natively.
  start_date: Joi.string().optional(),
  end_date: Joi.string().optional(),
});

export const createStreetRatingSchema = Joi.object({
  // Severity scale shared with incident reports: 1 = Minor … 4 = Critical.
  // Higher always means MORE dangerous.
  lighting_score: Joi.number().min(1).max(4).optional().allow(null),
  pedestrian_safety_score: Joi.number().min(1).max(4).required(),
  driver_safety_score: Joi.number().min(1).max(4).optional().allow(null),
  overall_safety_score: Joi.number().min(1).max(4).optional().allow(null),
  comment: Joi.string().pattern(/[a-zA-Z0-9]/).message('Comment must contain at least one alphanumeric character').allow('', null).optional(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
  photo_url: Joi.string().uri({ allowRelative: true }).allow('', null).optional(),
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
