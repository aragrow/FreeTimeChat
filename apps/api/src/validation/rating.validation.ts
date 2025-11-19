/**
 * Rating Validation Schemas
 *
 * Phase 5: Validation for rating endpoints
 */

import Joi from 'joi';

export const createRatingSchema = Joi.object({
  body: Joi.object({
    ratingType: Joi.string().valid('PREVIEW', 'REPORT').required(),
    rating: Joi.string().valid('BAD', 'OK', 'GOOD').required(),
    feedback: Joi.string().max(2000).optional().allow(''),
    metadata: Joi.object().optional(),
  }),
  params: Joi.object({
    messageId: Joi.string().uuid().required(),
  }),
});

export const getRatingsSchema = Joi.object({
  params: Joi.object({
    messageId: Joi.string().uuid().required(),
  }),
});

export const getRatingAnalyticsSchema = Joi.object({
  query: Joi.object({
    ratingType: Joi.string().valid('PREVIEW', 'REPORT').optional(),
  }),
});
