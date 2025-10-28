import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError, sendServerError, sendNotFound } from '../utils/response.js';
import { ensureWalletForUser, getAddressBalance, getAddressBalances, BalanceResponse } from '../services/openfortService.js'

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
 * Get user profile with wallet balance
 * GET /api/users/profile
 */
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        isEmailVerified: true,
        is2FAEnabled: true,
        createdAt: true,
        updatedAt: true,
        wallet: {
          select: {
            id: true,
            address: true,
            balance: true,
            openfortPlayerId: true,
            openfortAccountId: true,
            chainId: true,
            updatedAt: true
          }
        },
        groupMemberships: {
          where: {
            isActive: true
          },
          select: {
            id: true
          }
        }
      }
    });

    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    let walletInfo: any = null;

    try {
      if (user.wallet) {
        const wallet = user.wallet;
        const now = Date.now();
        const lastUpdate = new Date(wallet.updatedAt).getTime();
        const cacheExpiry = 30 * 1000; // 30 seconds
        
        let liveBalance = Number(wallet.balance) || 0; // Convert Decimal to number
        let balanceSource = 'cached';
        
        // Initialize balances with cached ETH balance, but we'll fetch both tokens if cache is expired
        let balances: BalanceResponse = { eth: liveBalance, usdc: 0 };
        
        if (now - lastUpdate > cacheExpiry) {
          try {
            // Fetch both ETH and USDC balances live
            balances = await getAddressBalances(wallet.address);
            liveBalance = balances.eth; // Keep legacy balance field for backward compatibility
            balanceSource = 'live';
            
            // Update cached balance in background (don't await) - store ETH balance for legacy compatibility
            prisma.wallet.update({
              where: { id: wallet.id },
              data: { 
                balance: balances.eth,
                updatedAt: new Date()
              }
            }).catch(err => console.warn('Failed to update cached balance:', err));
            
          } catch (error) {
            console.warn('Failed to fetch live balances:', error);
            // On error, keep the cached ETH balance but set USDC to 0 as fallback
            balances = { eth: liveBalance, usdc: 0 };
            balanceSource = 'cached_fallback';
          }
        } else {
          // Cache is still valid, but we should still try to get USDC balance if we don't have it cached
          // For now, we'll fetch both balances to ensure consistency
          try {
            balances = await getAddressBalances(wallet.address);
            liveBalance = balances.eth;
            balanceSource = 'live';
          } catch (error) {
            console.warn('Failed to fetch live balances for cached wallet:', error);
            balances = { eth: liveBalance, usdc: 0 };
            balanceSource = 'cached';
          }
        }

        walletInfo = {
          address: wallet.address,
          balance: liveBalance, // Legacy field for backward compatibility
          balances, // New field with both ETH and USDC
          balanceSource,
          openfortPlayerId: wallet.openfortPlayerId,
          openfortAccountId: wallet.openfortAccountId,
          lastSyncAt: new Date().toISOString(),
          provisioningStatus: wallet.openfortAccountId ? 'provisioned' : 'pending'
        };
      } else {
        // Auto-provision wallet if not found
        if (req.user.userId) {
          try {
            const provisionedWallet = await ensureWalletForUser(req.user.userId, user.email);
            walletInfo = {
              address: provisionedWallet.address,
              balance: 0, // Legacy field
              balances: { eth: 0, usdc: 0 }, // New field with both tokens
              balanceSource: 'live',
              openfortPlayerId: provisionedWallet.openfortPlayerId,
              openfortAccountId: provisionedWallet.openfortAccountId,
              lastSyncAt: new Date().toISOString(),
              provisioningStatus: provisionedWallet.openfortAccountId ? 'provisioned' : 'pending'
            };
          } catch (error) {
            console.error('Auto-provision wallet failed:', error);
            walletInfo = {
              provisioningStatus: 'failed',
              error: 'Wallet provisioning failed'
            };
          }
        }
      }
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      walletInfo = {
        provisioningStatus: 'error',
        error: 'Failed to fetch wallet information'
      };
    }

    // Get chain information
    const chainId = user.wallet?.chainId || 11155111; // Default to Sepolia
    const currentChain = chainId === 11155111 ? 'Sepolia' : 'Unknown';
    
    // Count active group memberships
    const groupMembershipCount = user.groupMemberships.length;

    const profile = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      isEmailVerified: user.isEmailVerified,
      is2FAEnabled: user.is2FAEnabled,
      currentChain,
      currentChainId: chainId,
      groupMembershipCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      wallet: walletInfo
    };

    sendSuccess(res, profile, 'Profile retrieved successfully');
  } catch (error: any) {
    console.error('getUserProfile error:', error);
    sendServerError(res, error?.message || 'Failed to fetch user profile');
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
 * Get user's wallet with live balance
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
        openfortPlayerId: true,
        openfortAccountId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!wallet) {
      // Auto-provision wallet if not found
      try {
        const user = await prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { email: true }
        });

        if (!user) {
          sendError(res, 'User not found', 404);
          return;
        }

        const provisionedWallet = await ensureWalletForUser(req.user.userId, user.email);
        const liveBalance = await getAddressBalance(provisionedWallet.address);
        
        sendSuccess(res, { 
          wallet: {
            ...provisionedWallet,
            liveBalance: liveBalance.toString(),
            lastSyncAt: new Date().toISOString()
          }
        });
        return;
      } catch (error) {
        console.error('Auto-provision wallet failed:', error);
        sendNotFound(res, 'Wallet not found and auto-provision failed');
        return;
      }
    }

    try {
      // Fetch live balances from blockchain
      const balances = await getAddressBalances(wallet.address);
      
      // Update cached balance (store ETH balance for legacy compatibility)
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { 
          balance: balances.eth,
          updatedAt: new Date()
        }
      });

      sendSuccess(res, { 
        wallet: {
          ...wallet,
          liveBalance: balances.eth.toString(), // Legacy field
          balances, // New field with both ETH and USDC
          lastSyncAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('Failed to fetch live balances, using cached:', error);
      sendSuccess(res, { 
        wallet: {
          ...wallet,
          liveBalance: wallet.balance?.toString() || '0', // Legacy field
          balances: { eth: Number(wallet.balance) || 0, usdc: 0 }, // Fallback balances
          lastSyncAt: wallet.updatedAt?.toISOString(),
          balanceWarning: 'Using cached balance - live balance unavailable'
        }
      });
    }
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
    
    // Fetch initial live balance
    try {
      const liveBalance = await getAddressBalance(wallet.address);
      sendSuccess(res, { 
        wallet: {
          ...wallet,
          liveBalance: liveBalance.toString(),
          lastSyncAt: new Date().toISOString()
        }
      }, 'Wallet provisioned successfully', 201);
    } catch (error) {
      console.warn('Failed to fetch initial balance:', error);
      sendSuccess(res, { wallet }, 'Wallet provisioned successfully', 201);
    }
  } catch (error) {
    console.error('Error provisioning wallet:', error);
    sendServerError(res, 'Failed to provision wallet');
  }
}

