import jwt from 'jsonwebtoken';
import config from '../config/config';
import crypto from 'crypto';

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate an access token
 * @param payload - The payload to encode in the token
 * @returns The generated JWT access token
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn,
    issuer: 'roomy-api',
    audience: 'roomy-client',
  });
};

/**
 * Generate a refresh token
 * @param payload - The payload to encode in the token
 * @returns The generated JWT refresh token
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'roomy-api',
    audience: 'roomy-client',
  });
};

/**
 * Generate both access and refresh tokens
 * @param payload - The payload to encode in the tokens
 * @returns Object containing both access and refresh tokens
 */
export const generateTokenPair = (payload: JWTPayload): TokenPair => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Verify an access token
 * @param token - The token to verify
 * @returns The decoded payload if valid
 * @throws Error if token is invalid
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'roomy-api',
      audience: 'roomy-client',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw new Error('Token verification failed');
  }
};

/**
 * Verify a refresh token
 * @param token - The token to verify
 * @returns The decoded payload if valid
 * @throws Error if token is invalid
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'roomy-api',
      audience: 'roomy-client',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw new Error('Token verification failed');
  }
};

/**
 * Generate a random token for password reset or email verification
 * @param length - The length of the token (default: 32 bytes)
 * @returns A random hex string
 */
export const generateRandomToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Decode a JWT token without verifying it (useful for extracting expired token data)
 * @param token - The token to decode
 * @returns The decoded payload or null if invalid
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};

