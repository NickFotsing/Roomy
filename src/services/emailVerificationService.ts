import { PrismaClient } from '@prisma/client';
import { generateRandomToken } from '../utils/jwt.js';
import config from '../config/config.js';
import { sendEmail } from './emailService.js';

const prisma = new PrismaClient();

export interface EmailVerificationResult {
  success: boolean;
  message: string;
}

/**
 * Send email verification token
 */
export const sendEmailVerification = async (userId: string, email: string): Promise<EmailVerificationResult> => {
  try {
    // Generate verification token
    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + config.emailVerificationExpiration * 60 * 60 * 1000); // hours to milliseconds

    // Store token in database
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });

    // Create verification URL
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    // Send verification email
    const emailSubject = 'Verify Your Email - Roomy';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Thank you for signing up for Roomy! Please click the button below to verify your email address:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          This link will expire in ${config.emailVerificationExpiration} hours. If you didn't create an account with Roomy, you can safely ignore this email.
        </p>
      </div>
    `;

    await sendEmail(email, emailSubject, emailHtml);

    return {
      success: true,
      message: 'Verification email sent successfully'
    };
  } catch (error) {
    console.error('Failed to send email verification:', error);
    return {
      success: false,
      message: 'Failed to send verification email'
    };
  }
};

/**
 * Verify email using token
 */
export const verifyEmail = async (token: string): Promise<EmailVerificationResult> => {
  try {
    // Find valid token
    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        token,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!verificationToken) {
      return {
        success: false,
        message: 'Invalid or expired verification token'
      };
    }

    // Mark user as verified and token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date()
        }
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { isUsed: true }
      })
    ]);

    return {
      success: true,
      message: 'Email verified successfully'
    };
  } catch (error) {
    console.error('Failed to verify email:', error);
    return {
      success: false,
      message: 'Failed to verify email'
    };
  }
};

/**
 * Check if user needs email verification
 */
export const needsEmailVerification = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isEmailVerified: true }
  });

  return !user?.isEmailVerified;
};

/**
 * Resend email verification
 */
export const resendEmailVerification = async (userId: string): Promise<EmailVerificationResult> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isEmailVerified: true }
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    if (user.isEmailVerified) {
      return {
        success: false,
        message: 'Email is already verified'
      };
    }

    // Invalidate existing tokens
    await prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        isUsed: false
      },
      data: { isUsed: true }
    });

    // Send new verification email
    return await sendEmailVerification(userId, user.email);
  } catch (error) {
    console.error('Failed to resend email verification:', error);
    return {
      success: false,
      message: 'Failed to resend verification email'
    };
  }
};