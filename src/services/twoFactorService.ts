import { PrismaClient } from '@prisma/client';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface TwoFactorSetupResult {
  success: boolean;
  message: string;
  qrCodeUrl?: string;
  secret?: string;
  backupCodes?: string[];
}

export interface TwoFactorVerificationResult {
  success: boolean;
  message: string;
}

/**
 * Setup 2FA for user
 */
export const setup2FA = async (userId: string, email: string): Promise<TwoFactorSetupResult> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { is2FAEnabled: true, totpSecret: true }
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    if (user.is2FAEnabled) {
      return {
        success: false,
        message: '2FA is already enabled for this account'
      };
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Roomy (${email})`,
      issuer: 'Roomy',
      length: 32
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    // Store secret and backup codes (but don't enable 2FA yet)
    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: secret.base32,
        backupCodes: JSON.stringify(backupCodes)
      }
    });

    return {
      success: true,
      message: '2FA setup initiated. Please verify with your authenticator app.',
      qrCodeUrl,
      secret: secret.base32,
      backupCodes
    };
  } catch (error) {
    console.error('Failed to setup 2FA:', error);
    return {
      success: false,
      message: 'Failed to setup 2FA'
    };
  }
};

/**
 * Verify and enable 2FA
 */
export const verify2FASetup = async (userId: string, token: string): Promise<TwoFactorVerificationResult> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, is2FAEnabled: true }
    });

    if (!user || !user.totpSecret) {
      return {
        success: false,
        message: '2FA setup not found. Please initiate setup first.'
      };
    }

    if (user.is2FAEnabled) {
      return {
        success: false,
        message: '2FA is already enabled for this account'
      };
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds) of drift
    });

    if (!verified) {
      return {
        success: false,
        message: 'Invalid verification code'
      };
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { is2FAEnabled: true }
    });

    return {
      success: true,
      message: '2FA has been successfully enabled'
    };
  } catch (error) {
    console.error('Failed to verify 2FA setup:', error);
    return {
      success: false,
      message: 'Failed to verify 2FA setup'
    };
  }
};

/**
 * Verify 2FA token for login
 */
export const verify2FAToken = async (userId: string, token: string): Promise<TwoFactorVerificationResult> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, is2FAEnabled: true, backupCodes: true }
    });

    if (!user || !user.is2FAEnabled || !user.totpSecret) {
      return {
        success: false,
        message: '2FA is not enabled for this account'
      };
    }

    // First try TOTP verification
    const totpVerified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (totpVerified) {
      return {
        success: true,
        message: '2FA verification successful'
      };
    }

    // If TOTP fails, try backup codes
    if (user.backupCodes) {
      const backupCodes = JSON.parse(user.backupCodes) as string[];
      const codeIndex = backupCodes.indexOf(token.toUpperCase());

      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        
        await prisma.user.update({
          where: { id: userId },
          data: { backupCodes: JSON.stringify(backupCodes) }
        });

        return {
          success: true,
          message: '2FA verification successful (backup code used)'
        };
      }
    }

    return {
      success: false,
      message: 'Invalid 2FA code'
    };
  } catch (error) {
    console.error('Failed to verify 2FA token:', error);
    return {
      success: false,
      message: 'Failed to verify 2FA token'
    };
  }
};

/**
 * Disable 2FA
 */
export const disable2FA = async (userId: string, token: string): Promise<TwoFactorVerificationResult> => {
  try {
    // First verify the current 2FA token
    const verification = await verify2FAToken(userId, token);
    
    if (!verification.success) {
      return verification;
    }

    // Disable 2FA and clear secrets
    await prisma.user.update({
      where: { id: userId },
      data: {
        is2FAEnabled: false,
        totpSecret: null,
        backupCodes: null
      }
    });

    return {
      success: true,
      message: '2FA has been disabled successfully'
    };
  } catch (error) {
    console.error('Failed to disable 2FA:', error);
    return {
      success: false,
      message: 'Failed to disable 2FA'
    };
  }
};

/**
 * Generate new backup codes
 */
export const generateNewBackupCodes = async (userId: string, token: string): Promise<TwoFactorSetupResult> => {
  try {
    // First verify the current 2FA token
    const verification = await verify2FAToken(userId, token);
    
    if (!verification.success) {
      return {
        success: false,
        message: verification.message
      };
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    await prisma.user.update({
      where: { id: userId },
      data: { backupCodes: JSON.stringify(backupCodes) }
    });

    return {
      success: true,
      message: 'New backup codes generated successfully',
      backupCodes
    };
  } catch (error) {
    console.error('Failed to generate new backup codes:', error);
    return {
      success: false,
      message: 'Failed to generate new backup codes'
    };
  }
};