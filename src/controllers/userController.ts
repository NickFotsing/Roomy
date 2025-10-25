import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError, sendServerError, sendNotFound } from '../utils/response.js';
import { ensureWalletForUser } from '../services/openfortService.js'

const prisma = new PrismaClient();

/**
 * Get user profile by ID
 * GET /api/users/:userId
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isEmailVerified: true,
        createdAt: true,
      }
    });

    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    sendSuccess(res, { user });
  } catch (error) {
    sendServerError(res, 'Failed to fetch user');
  }
};

/**
 * Update user profile
 * PUT /api/users/profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { firstName, lastName, phoneNumber, avatarUrl } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        phoneNumber: phoneNumber ?? null,
        avatarUrl: avatarUrl ?? null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        avatarUrl: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    sendSuccess(res, { user: updatedUser }, 'Profile updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendServerError(res, 'Failed to update profile');
    }
  }
};

/**
 * Delete user account
 * DELETE /api/users/account
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: req.user.userId }
    });

    sendSuccess(res, null, 'Account deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, error.message, 400);
    } else {
      sendServerError(res, 'Failed to delete account');
    }
  }
};

/**
 * Get user's groups
 * GET /api/users/groups
 */
export const getUserGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: req.user.userId,
        isActive: true
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            smartAccountAddress: true,
            isActive: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    const groups = memberships.map((m: any) => ({
      ...m.group,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    sendSuccess(res, { groups });
  } catch (error) {
    sendServerError(res, 'Failed to fetch user groups');
  }
};

/**
 * Get user's wallet
 * GET /api/users/wallet
 */
export const getUserWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.userId },
      select: {
        id: true,
        address: true,
        balance: true,
        chainId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!wallet) {
      sendNotFound(res, 'Wallet not found');
      return;
    }

    sendSuccess(res, { wallet });
  } catch (error) {
    sendServerError(res, 'Failed to fetch wallet');
  }
};

/**
 * Get user's notifications
 * GET /api/users/notifications
 */
export const getUserNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { unreadOnly } = req.query;

    const whereClause: any = { userId: req.user.userId };
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: 50, // Limit to 50 most recent
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.userId,
        isRead: false,
      }
    });

    sendSuccess(res, { notifications, unreadCount });
  } catch (error) {
    sendServerError(res, 'Failed to fetch notifications');
  }
};

/**
 * Mark a specific notification as read
 * POST /api/users/notifications/:id/read
 */
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const id = req.params.id as string;

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    sendSuccess(res, { notification }, 'Notification marked as read');
  } catch (error) {
    sendServerError(res, 'Failed to mark notification as read');
  }
};

/**
 * Mark all notifications as read
 * POST /api/users/notifications/read-all
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true }
    });

    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    sendServerError(res, 'Failed to mark notifications as read');
  }
};

export const provisionWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const wallet = await ensureWalletForUser(userId, user.email);
    sendSuccess(res, { wallet }, 'Wallet provisioned successfully', 201);
  } catch (error) {
    console.error('Error provisioning wallet:', error);
    sendServerError(res, 'Failed to provision wallet');
  }
}

