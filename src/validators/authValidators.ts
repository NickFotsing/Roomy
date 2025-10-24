import { validatePasswordStrength } from '../utils/password.js';
import { body } from 'express-validator';

export const registerValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').custom(validatePasswordStrength),
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
  body('username').isString().notEmpty(),
];

export const loginValidation = [
  body('emailOrUsername').isString().notEmpty(),
  body('password').isString().notEmpty(),
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

