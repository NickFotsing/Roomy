import { body, param, query } from 'express-validator';

export const createTransactionValidation = [
  body('billId')
    .optional()
    .isUUID()
    .withMessage('Bill ID must be a valid UUID'),
  body('groupId')
    .optional()
    .isUUID()
    .withMessage('Group ID must be a valid UUID'),
  body('receiverId')
    .optional()
    .isUUID()
    .withMessage('Receiver ID must be a valid UUID'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isIn(['USDC', 'ETH', 'MATIC'])
    .withMessage('Currency must be USDC, ETH, or MATIC'),
  body('type')
    .isIn(['BILL_PAYMENT', 'DEPOSIT', 'WITHDRAWAL', 'REFUND', 'TRANSFER'])
    .withMessage('Invalid transaction type'),
  body('toAddress')
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid JSON object')
];

export const getGroupTransactionsValidation = [
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

export const getTransactionValidation = [
  param('transactionId')
    .isUUID()
    .withMessage('Transaction ID must be a valid UUID')
];