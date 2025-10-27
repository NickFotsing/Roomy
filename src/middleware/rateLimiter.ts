import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter - Very lenient for development
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (increased from 100)
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Lenient rate limiter for auth endpoints - Development mode
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 auth requests per windowMs (increased from 10)
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lenient rate limiter for password reset - Development mode
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 password reset requests per hour (increased from 3)
  message: {
    success: false,
    error: 'Too many password reset attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lenient blockchain transaction rate limiter - Development mode
export const transactionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // Limit each IP to 200 transaction requests per 5 minutes (increased from 20)
  message: {
    success: false,
    error: 'Too many transaction requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom rate limiter for user-specific limits
export const createUserLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise fall back to IP
      return req.user?.userId || req.ip || 'unknown';
    },
    message: {
      success: false,
      error: message,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};