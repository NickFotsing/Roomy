import { body, param } from 'express-validator';

export const createProposalValidation = [
  body('billId')
    .isUUID()
    .withMessage('Bill ID must be a valid UUID'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('votingDeadline')
    .isISO8601()
    .withMessage('Voting deadline must be a valid ISO 8601 date')
];

export const voteOnProposalValidation = [
  param('proposalId')
    .isUUID()
    .withMessage('Proposal ID must be a valid UUID'),
  body('isApproved')
    .isBoolean()
    .withMessage('Approval status must be a boolean'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment must not exceed 500 characters')
];

export const getProposalValidation = [
  param('proposalId')
    .isUUID()
    .withMessage('Proposal ID must be a valid UUID')
];