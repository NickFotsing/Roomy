import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import { PrismaClient, MemberRole } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendUnauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, isEmailVerified: true, accountLockedUntil: true }
    });

    if (!user) {
      sendUnauthorized(res, 'User not found');
      return;
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      sendUnauthorized(res, 'Account is locked. Please try again later.');
      return;
    }

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof Error) {
      sendUnauthorized(res, error.message);
    } else {
      sendUnauthorized(res, 'Authentication failed');
    }
  }
};

/**
 * Middleware to check if user's email is verified
 */
export const requireEmailVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isEmailVerified: true }
    });

    if (!user?.isEmailVerified) {
      sendForbidden(res, 'Email verification required');
      return;
    }

    next();
  } catch (error) {
    sendForbidden(res, 'Email verification check failed');
  }
};

/**
 * Middleware to check if user is a member of a specific group
 */
export const requireGroupMembership = (groupIdParam: string = 'groupId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res, 'Authentication required');
        return;
      }

      const groupId = req.params[groupIdParam] || req.body.groupId;

      if (!groupId) {
        sendForbidden(res, 'Group ID is required');
        return;
      }

      const membership = await prisma.groupMember.findFirst({
        where: {
          userId: req.user.userId,
          groupId: groupId,
          isActive: true
        }
      });

      if (!membership) {
        sendForbidden(res, 'You are not a member of this group');
        return;
      }

      next();
    } catch (error) {
      sendForbidden(res, 'Group membership check failed');
    }
  };
};

/**
 * Middleware to check if user has a specific role in a group
 */
export const requireGroupRole = (
  requiredRoles: MemberRole[],
  groupIdParam: string = 'groupId'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res, 'Authentication required');
        return;
      }

      const groupId = req.params[groupIdParam] || req.body.groupId;

      if (!groupId) {
        sendForbidden(res, 'Group ID is required');
        return;
      }

      const membership = await prisma.groupMember.findFirst({
        where: {
          userId: req.user.userId,
          groupId: groupId,
          isActive: true
        }
      });

      if (!membership) {
        sendForbidden(res, 'You are not a member of this group');
        return;
      }

      if (!requiredRoles.includes(membership.role)) {
        sendForbidden(res, `Required role: ${requiredRoles.join(' or ')}`);
        return;
      }

      next();
    } catch (error) {
      sendForbidden(res, 'Role check failed');
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

