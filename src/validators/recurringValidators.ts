import { body, param } from 'express-validator';

export const getGroupRecurringValidation = [
  param('groupId').isString().isUUID().withMessage('groupId must be a valid UUID'),
];

export const createRecurringValidation = [
  body('groupId').isString().isUUID(),
  body('title').isString().isLength({ min: 2, max: 120 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('amount').isNumeric().custom((v) => Number(v) > 0),
  body('currency').optional().isString().isIn(['USDC', 'ETH']).withMessage('Unsupported currency'),
  body('payeeAddress').isString().isLength({ min: 4 }),
  body('frequency').isString().isIn(['DAILY','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','YEARLY']),
  body('startDate').isISO8601(),
  body('endDate').optional({ nullable: true }).isISO8601(),
  body('autoPropose').optional().isBoolean(),
  body('categoryId').optional({ nullable: true }).isString().isUUID(),
];

export const updateRecurringValidation = [
  param('recurringId').isString().isUUID(),
  body('title').optional().isString().isLength({ min: 2, max: 120 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('amount').optional().isNumeric().custom((v) => Number(v) > 0),
  body('currency').optional().isString().isIn(['USDC', 'ETH']),
  body('payeeAddress').optional().isString().isLength({ min: 4 }),
  body('frequency').optional().isString().isIn(['DAILY','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','YEARLY']),
  body('startDate').optional().isISO8601(),
  body('nextDueDate').optional().isISO8601(),
  body('endDate').optional({ nullable: true }).isISO8601(),
  body('isActive').optional().isBoolean(),
  body('autoPropose').optional().isBoolean(),
  body('categoryId').optional({ nullable: true }).isString().isUUID(),
];