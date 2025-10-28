import { Request, Response } from 'express';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { sendEmailVerification, verifyEmail, resendEmailVerification } from '../services/emailVerificationService.js';

/**
 * Send email verification
 * POST /api/auth/send-verification
 */
export const sendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const result = await sendEmailVerification(req.user.userId, req.user.email);
    
    if (result.success) {
      sendSuccess(res, null, result.message);
    } else {
      sendError(res, result.message, 400);
    }
  } catch (error: any) {
    console.error('Send verification email error:', error);
    sendServerError(res, error?.message || 'Failed to send verification email');
  }
};

/**
 * Verify email with token
 * POST /api/auth/verify-email
 */
export const verifyEmailToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      sendError(res, 'Verification token is required', 400);
      return;
    }

    const result = await verifyEmail(token);
    
    if (result.success) {
      sendSuccess(res, null, result.message);
    } else {
      sendError(res, result.message, 400);
    }
  } catch (error: any) {
    console.error('Verify email error:', error);
    sendServerError(res, error?.message || 'Failed to verify email');
  }
};

/**
 * Resend email verification
 * POST /api/auth/resend-verification
 */
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const result = await resendEmailVerification(req.user.userId);
    
    if (result.success) {
      sendSuccess(res, null, result.message);
    } else {
      sendError(res, result.message, 400);
    }
  } catch (error: any) {
    console.error('Resend verification email error:', error);
    sendServerError(res, error?.message || 'Failed to resend verification email');
  }
};