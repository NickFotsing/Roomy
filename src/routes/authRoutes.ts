import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as emailVerificationController from '../controllers/emailVerificationController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} from '../validators/authValidators.js';

const router = Router();

// Public routes with stricter rate limiting
router.post('/register', authLimiter, validate(registerValidation), authController.register);
router.post('/login', authLimiter, validate(loginValidation), authController.login);
router.post('/refresh', authLimiter, validate(refreshTokenValidation), authController.refreshToken);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordValidation), authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordValidation), authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.post('/change-password', authenticate, validate(changePasswordValidation), authController.changePassword);

// Email verification routes
router.post('/send-verification', authenticate, emailVerificationController.sendVerificationEmail);
router.post('/verify-email', emailVerificationController.verifyEmailToken);
router.post('/resend-verification', authenticate, emailVerificationController.resendVerificationEmail);

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

export default router;