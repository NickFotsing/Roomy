import { body, param } from 'express-validator';

export const getGroupCategoriesValidation = [
  param('groupId')
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
];

export const createCategoryValidation = [
  body('groupId')
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('color')
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage('Color must be a short string'),
  body('icon')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Icon must be a short string'),
  body('monthlyLimit')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Monthly limit must be a positive number')
];

export const updateCategoryValidation = [
  param('categoryId')
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('color')
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage('Color must be a short string'),
  body('icon')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Icon must be a short string'),
  body('monthlyLimit')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Monthly limit must be a positive number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];