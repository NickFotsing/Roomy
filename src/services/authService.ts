import { PrismaClient, User } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateTokenPair, generateRefreshToken, verifyRefreshToken, generateRandomToken, JWTPayload } from '../utils/jwt.js';
import config from '../config/config.js';

const prisma = new PrismaClient();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface LoginData {
  emailOrUsername: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

/**
 * Register a new user
 */
export const registerUser = async (data: RegisterData): Promise<AuthResult> => {
  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        { username: data.username }
      ]
    }
  });

  if (existingUser) {
    if (existingUser.email === data.email) {
      throw new Error('Email already registered');
    }
    if (existingUser.username === data.username) {
      throw new Error('Username already taken');
    }
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      username: data.username,
      password: hashedPassword,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      phoneNumber: data.phoneNumber ?? null,
    }
  });

  // Generate tokens
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
  };

  const tokens = generateTokenPair(payload);

  // Store refresh token
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: refreshTokenExpiry,
    }
  });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

/**
 * Login user
 */
export const loginUser = async (data: LoginData): Promise<AuthResult> => {
  // Find user by email or username
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.emailOrUsername },
        { username: data.emailOrUsername }
      ]
    }
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if account is locked
  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.accountLockedUntil.getTime() - new Date().getTime()) / (1000 * 60)
    );
    throw new Error(`Account is locked. Try again in ${minutesLeft} minutes.`);
  }

  // Verify password
  const isPasswordValid = await comparePassword(data.password, user.password);

  if (!isPasswordValid) {
    // Increment failed attempts
    const failedAttempts = user.failedLoginAttempts + 1;
    
    const updateData: any = {
      failedLoginAttempts: failedAttempts,
    };

    // Lock account if max attempts reached
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutTime = new Date();
      lockoutTime.setMinutes(lockoutTime.getMinutes() + LOCKOUT_DURATION_MINUTES);
      updateData.accountLockedUntil = lockoutTime;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      throw new Error(`Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`);
    }

    throw new Error('Invalid credentials');
  }

  // Reset failed attempts and update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      lastLoginAt: new Date(),
    }
  });

  // Generate tokens
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
  };

  const tokens = generateTokenPair(payload);

  // Store refresh token
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: refreshTokenExpiry,
    }
  });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<{ accessToken: string }> => {
  // Verify refresh token
  let payload: JWTPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }

  // Check if refresh token exists and is not revoked
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      token: refreshToken,
      userId: payload.userId,
      isRevoked: false,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (!storedToken) {
    throw new Error('Refresh token not found or has been revoked');
  }

  // Get updated user data
  const user = await prisma.user.findUnique({
    where: { id: payload.userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Generate new access token with updated user data
  const newPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
  };

  const tokens = generateTokenPair(newPayload);

  return {
    accessToken: tokens.accessToken,
  };
};

/**
 * Logout user (revoke refresh token)
 */
export const logoutUser = async (refreshToken: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { isRevoked: true }
  });
};

/**
 * Logout from all devices (revoke all refresh tokens)
 */
export const logoutAllDevices = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true }
  });
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (email: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    // Return success even if user doesn't exist (security best practice)
    return 'If the email exists, a reset link has been sent';
  }

  // Generate reset token
  const resetToken = generateRandomToken();
  
  // Calculate expiry time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + config.passwordResetExpiration);

  // Invalidate any existing reset tokens
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      isUsed: false,
      expiresAt: { gt: new Date() }
    },
    data: { isUsed: true }
  });

  // Store reset token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt,
    }
  });

  // TODO: Send email with reset link
  // const resetLink = `${config.frontendUrl}/reset-password?token=${resetToken}`;
  // await sendPasswordResetEmail(user.email, resetLink);

  return resetToken; // In production, don't return this, just send email
};

/**
 * Reset password using token
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  // Find valid token
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      token,
      isUsed: false,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });

  if (!resetToken) {
    throw new Error('Invalid or expired reset token');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and mark token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      }
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { isUsed: true }
    }),
    // Revoke all refresh tokens for security
    prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId },
      data: { isRevoked: true }
    })
  ]);
};

/**
 * Change password (when user is logged in)
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, user.password);
  
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  // Optionally revoke all other refresh tokens (force logout from other devices)
  // await logoutAllDevices(userId);
};

