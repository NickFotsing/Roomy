import { Request, Response } from 'express';
import * as twoFactorService from '../services/twoFactorService.js';

/**
 * Setup 2FA for the authenticated user
 */
export const setup2FA = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const email = req.user?.email;

    if (!userId || !email) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const result = await twoFactorService.setup2FA(userId, email);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Verify 2FA setup and enable it
 */
export const verify2FASetup = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { token } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const result = await twoFactorService.verify2FASetup(userId, token);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Verify 2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Verify 2FA token for authentication
 */
export const verify2FAToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { token } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const result = await twoFactorService.verify2FAToken(userId, token);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Verify 2FA token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Disable 2FA for the authenticated user
 */
export const disable2FA = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to disable 2FA'
      });
    }

    const result = await twoFactorService.disable2FA(userId, password);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Generate new backup codes
 */
export const generateNewBackupCodes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to generate new backup codes'
      });
    }

    const result = await twoFactorService.generateNewBackupCodes(userId, password);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Generate backup codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};