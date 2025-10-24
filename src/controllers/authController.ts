import { Request, Response } from 'express';
import * as authService from '../services/authService.js';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { ensureWalletForUser } from '../services/openfortService.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.registerUser(req.body);
    
    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      'Registration successful',
      201
    );
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendServerError(res, 'Registration failed');
    }
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.loginUser(req.body);
    
    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      'Login successful'
    );
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 401);
    } else {
      sendServerError(res, 'Login failed');
    }
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    
    sendSuccess(res, result, 'Token refreshed successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 401);
    } else {
      sendServerError(res, 'Token refresh failed');
    }
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    await authService.logoutUser(refreshToken);
    
    sendSuccess(res, null, 'Logout successful');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendServerError(res, 'Logout failed');
    }
  }
};

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    await authService.logoutAllDevices(req.user.userId);
    
    sendSuccess(res, null, 'Logged out from all devices');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendServerError(res, 'Logout failed');
    }
  }
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const message = await authService.requestPasswordReset(email);
    
    // In development, return the token. In production, just send success message
    if (process.env.NODE_ENV === 'development') {
      sendSuccess(res, { resetToken: message }, 'Password reset email sent');
    } else {
      sendSuccess(res, null, 'If the email exists, a reset link has been sent');
    }
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendServerError(res, 'Password reset request failed');
    }
  }
};

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    
    sendSuccess(res, null, 'Password reset successful');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendServerError(res, 'Password reset failed');
    }
  }
};

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.userId, currentPassword, newPassword);
    
    sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendServerError(res, 'Password change failed');
    }
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        avatarUrl: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.userId },
      select: {
        id: true,
        address: true,
        chainId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    sendSuccess(res, { user, wallet });
  } catch (error) {
    sendServerError(res, 'Failed to fetch user profile');
  }
};

export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Optional: accept clientToken from Openfort Client SDK (not required in this flow)
    // const { clientToken } = req.body;

    const wallet = await ensureWalletForUser(user.id, user.email);

    sendSuccess(res, { user, wallet }, 'Session created');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendServerError(res, 'Session creation failed');
    }
  }
};

