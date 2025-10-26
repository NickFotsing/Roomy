import { body } from 'express-validator';

export const createGroupValidation = [
  body('name').isString().withMessage('Name must be a string').isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  body('votingThreshold').optional().isInt({ min: 1, max: 100 }).withMessage('Voting threshold must be between 1 and 100'),
  body('memberEmails').optional().isArray().withMessage('memberEmails must be an array'),
  body('memberEmails.*').optional().isEmail().withMessage('Each member email must be valid'),
  // Optional client-provided smart account address
  body('smartAccountAddress')
    .optional()
    .isString()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('smartAccountAddress must be a valid EVM address'),
];

export const inviteMembersValidation = [
  body('emails').isArray({ min: 1 }).withMessage('Provide at least one email'),
  body('emails.*').isEmail().withMessage('Each email must be valid'),
];

export const joinGroupValidation = [
  body('token').isString().notEmpty().withMessage('Invite token is required'),
];

// Allow partial updates for group settings
export const updateGroupValidation = [
  body('name').optional().isString().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  body('description').optional().isString().isLength({ max: 500 }).withMessage('Description max 500 characters'),
  body('imageUrl').optional().isString().isLength({ max: 300 }).withMessage('Image URL max 300 characters'),
  body('votingThreshold').optional().isInt({ min: 1, max: 100 }).withMessage('Voting threshold must be between 1 and 100'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];