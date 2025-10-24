import { validatePasswordStrength } from '../utils/password.js';
import { body } from 'express-validator';

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address'),
  body('password')
    .custom(validatePasswordStrength),
  body('firstName')
    .optional()
    .isString()
    .withMessage('First name must be a string'),
  body('lastName')
    .optional()
    .isString()
    .withMessage('Last name must be a string'),
  body('username')
    .isString()
    .withMessage('Username must be a string')
    .notEmpty()
    .withMessage('Username is required'),
];

export const loginValidation = [
  body('emailOrUsername')
    .isString()
    .withMessage('Email or username must be a string')
    .notEmpty()
    .withMessage('Email or username is required'),
  body('password')
    .isString()
    .withMessage('Password must be a string')
    .notEmpty()
    .withMessage('Password is required'),
];

export const refreshTokenValidation = [
  body('refreshToken').isString().notEmpty(),
];

export const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
];

export const resetPasswordValidation = [
  body('token').isString().notEmpty(),
  body('newPassword').custom(validatePasswordStrength),
];

export const changePasswordValidation = [
  body('currentPassword').isString().notEmpty(),
  body('newPassword').custom(validatePasswordStrength),
];

export const updateProfileValidation = [
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
  body('phoneNumber').optional().isString(),
  body('avatarUrl').optional().isString(),
];

