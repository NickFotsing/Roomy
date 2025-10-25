import { body, param, query } from 'express-validator';

export const createBillValidation = [
  body('groupId')
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
  
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('totalAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Total amount must be a positive number'),
  
  body('currency')
    .optional()
    .isIn(['USDC', 'ETH', 'MATIC'])
    .withMessage('Currency must be USDC, ETH, or MATIC'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  
  body('payeeAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Payee address must be a valid Ethereum address'),
  
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  
  body('attachmentUrl')
    .optional()
    .isURL()
    .withMessage('Attachment URL must be a valid URL'),
  
  body('items')
    .optional()
    .isArray()
    .withMessage('Items must be an array'),
  
  body('items.*.description')
    .if(body('items').exists())
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Item description must be between 1 and 200 characters'),
  
  body('items.*.amount')
    .if(body('items').exists())
    .isFloat({ min: 0.01 })
    .withMessage('Item amount must be a positive number'),
  
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Item quantity must be a positive integer')
];

export const updateBillValidation = [
  param('billId')
    .isUUID()
    .withMessage('Bill ID must be a valid UUID'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('totalAmount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Total amount must be a positive number'),
  
  body('currency')
    .optional()
    .isIn(['USDC', 'ETH', 'MATIC'])
    .withMessage('Currency must be USDC, ETH, or MATIC'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  
  body('payeeAddress')
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Payee address must be a valid Ethereum address'),
  
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  
  body('attachmentUrl')
    .optional()
    .isURL()
    .withMessage('Attachment URL must be a valid URL'),
  
  body('status')
    .optional()
    .isIn(['DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'])
    .withMessage('Status must be a valid bill status'),
  
  body('items')
    .optional()
    .isArray()
    .withMessage('Items must be an array'),
  
  body('items.*.description')
    .if(body('items').exists())
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Item description must be between 1 and 200 characters'),
  
  body('items.*.amount')
    .if(body('items').exists())
    .isFloat({ min: 0.01 })
    .withMessage('Item amount must be a positive number'),
  
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Item quantity must be a positive integer')
];

export const getBillValidation = [
  param('billId')
    .isUUID()
    .withMessage('Bill ID must be a valid UUID')
];

export const getGroupBillsValidation = [
  param('groupId')
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

export const getUserBillsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];