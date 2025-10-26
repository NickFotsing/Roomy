import { Request, Response } from 'express';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { createGroup, inviteMembers, joinGroupWithToken, getGroupDetails, updateGroup, deleteGroup } from '../services/groupService.js';
import { getAddressBalance, getAddressBalances, BalanceResponse } from '../services/openfortService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cache for group balances (30 second TTL)
const balanceCache = new Map<string, { balances: BalanceResponse; timestamp: number }>();
const BALANCE_CACHE_TTL = 30 * 1000; // 30 seconds

export const createGroupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { name, votingThreshold, memberEmails, smartAccountAddress } = req.body;
    const group = await createGroup(userId, { name, votingThreshold, memberEmails, smartAccountAddress });
    sendSuccess(res, group, 'Group created', 201);
  } catch (error: any) {
    console.error('createGroupHandler error:', error);
    sendServerError(res, error?.message || 'Failed to create group');
  }
};

export const inviteMembersHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { groupId } = req.params;
    
    // Add this validation
    if (!groupId) {
      sendError(res, 'Group ID is required', 422);
      return;
    }

    const { emails } = req.body;
    const result = await inviteMembers({ groupId, inviterUserId: userId, emails });
    sendSuccess(res, result, 'Invites generated', 201);
  } catch (error: any) {
    console.error('inviteMembersHandler error:', error);
    sendServerError(res, error?.message || 'Failed to invite members');
  }
};

export const joinGroupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { groupId } = req.params;
    
    // Add this validation
    if (!groupId) {
      sendError(res, 'Group ID is required', 422);
      return;
    }

    const { token } = req.body;
    const result = await joinGroupWithToken(userId, token);
    sendSuccess(res, result, 'Joined group');
  } catch (error: any) {
    console.error('joinGroupHandler error:', error);
    sendServerError(res, error?.message || 'Failed to join group');
  }
};

export const getUserGroupsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            smartAccountAddress: true,
            votingThreshold: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    // Fetch balances for groups with smart accounts
    const groupsWithBalances = await Promise.all(
      memberships.map(async (membership: any) => {
        let balances: BalanceResponse | null = null;
        let balanceSource = 'none';

        if (membership.group.smartAccountAddress) {
          const cacheKey = membership.group.smartAccountAddress;
          const cached = balanceCache.get(cacheKey);
          const now = Date.now();

          console.log(`🏦 [GROUP BALANCE DEBUG] Fetching balances for group: ${membership.group.name} (${membership.group.id})`);
          console.log(`🏦 [GROUP BALANCE DEBUG] Smart account address: ${membership.group.smartAccountAddress}`);
          console.log(`🏦 [GROUP BALANCE DEBUG] Cache key: ${cacheKey}`);
          console.log(`🏦 [GROUP BALANCE DEBUG] Cached data:`, cached ? { balances: cached.balances, age: now - cached.timestamp } : 'No cache');

          if (cached && (now - cached.timestamp) < BALANCE_CACHE_TTL) {
            balances = cached.balances;
            balanceSource = 'cached';
            console.log(`🏦 [GROUP BALANCE DEBUG] Using cached balances: ${balances.eth} ETH, ${balances.usdc} USDC (age: ${now - cached.timestamp}ms)`);
          } else {
            try {
              console.log(`🏦 [GROUP BALANCE DEBUG] Cache miss or expired, fetching live balances...`);
              balances = await getAddressBalances(membership.group.smartAccountAddress);
              balanceSource = 'live';
              
              console.log(`🏦 [GROUP BALANCE DEBUG] Live balances fetched: ${balances.eth} ETH, ${balances.usdc} USDC`);
              
              // Cache the balances
              balanceCache.set(cacheKey, { balances, timestamp: now });
              console.log(`🏦 [GROUP BALANCE DEBUG] Balances cached for future requests`);
            } catch (error) {
              console.warn(`❌ [GROUP BALANCE DEBUG] Failed to fetch balances for group ${membership.group.id}:`, error);
              balances = cached?.balances || { eth: 0, usdc: 0 };
              balanceSource = cached ? 'cached_fallback' : 'error';
              console.log(`🏦 [GROUP BALANCE DEBUG] Using fallback balances: ${balances.eth} ETH, ${balances.usdc} USDC (source: ${balanceSource})`);
            }
          }
        } else {
          console.log(`🏦 [GROUP BALANCE DEBUG] Group ${membership.group.name} has no smart account address`);
        }

        return {
          id: membership.group.id,
          name: membership.group.name,
          description: membership.group.description,
          smartAccountAddress: membership.group.smartAccountAddress,
          balances,
          balanceSource,
          votingThreshold: membership.group.votingThreshold,
          isActive: membership.group.isActive,
          createdAt: membership.group.createdAt,
          updatedAt: membership.group.updatedAt,
          // Add user's role in the group
          userRole: membership.role,
          joinedAt: membership.joinedAt,
        };
      })
    );

    sendSuccess(res, groupsWithBalances, 'Groups retrieved successfully');
  } catch (error: any) {
    console.error('getUserGroupsHandler error:', error);
    sendServerError(res, error?.message || 'Failed to fetch user groups');
  }
};

export const getGroupByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    
    // Add this validation
    if (!groupId) {
      sendError(res, 'Group ID is required', 422);
      return;
    }

    const group = await getGroupDetails(groupId);
    sendSuccess(res, group);
  } catch (error: any) {
    console.error('getGroupByIdHandler error:', error);
    sendServerError(res, error?.message || 'Failed to fetch group details');
  }
};

export const updateGroupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { groupId } = req.params;
    if (!groupId) {
      sendError(res, 'Group ID is required', 422);
      return;
    }

    const { name, description, imageUrl, votingThreshold, isActive } = req.body;
    const updated = await updateGroup(userId, groupId, { name, description, imageUrl, votingThreshold, isActive });
    sendSuccess(res, updated, 'Group updated');
  } catch (error: any) {
    console.error('updateGroupHandler error:', error);
    sendServerError(res, error?.message || 'Failed to update group');
  }
};

export const deleteGroupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { groupId } = req.params;
    if (!groupId) {
      sendError(res, 'Group ID is required', 422);
      return;
    }

    await deleteGroup(userId, groupId);
    sendSuccess(res, null, 'Group deleted');
  } catch (error: any) {
    console.error('deleteGroupHandler error:', error);
    sendServerError(res, error?.message || 'Failed to delete group');
  }
};

export const refreshGroupBalanceHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    if (!groupId) {
      sendError(res, 'Group ID is required', 422);
      return;
    }

    console.log(`🔄 [BALANCE REFRESH DEBUG] Manual balance refresh requested for group: ${groupId}`);

    // Get group details
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { 
        id: true, 
        name: true, 
        smartAccountAddress: true,
        isActive: true 
      }
    });

    if (!group || !group.isActive) {
      sendError(res, 'Group not found or inactive', 404);
      return;
    }

    if (!group.smartAccountAddress) {
      sendError(res, 'Group has no smart account address', 400);
      return;
    }

    console.log(`🔄 [BALANCE REFRESH DEBUG] Group found: ${group.name}`);
    console.log(`🔄 [BALANCE REFRESH DEBUG] Smart account address: ${group.smartAccountAddress}`);

    // Clear cache for this group
    const cacheKey = group.smartAccountAddress;
    const hadCache = balanceCache.has(cacheKey);
    balanceCache.delete(cacheKey);
    
    console.log(`🔄 [BALANCE REFRESH DEBUG] Cache cleared (had cache: ${hadCache})`);

    // Fetch fresh balances
    const startTime = Date.now();
    const balances = await getAddressBalances(group.smartAccountAddress);
    const fetchTime = Date.now() - startTime;

    console.log(`🔄 [BALANCE REFRESH DEBUG] Fresh balances fetched: ${balances.eth} ETH, ${balances.usdc} USDC (took ${fetchTime}ms)`);

    // Update cache with fresh data
    balanceCache.set(cacheKey, { balances, timestamp: Date.now() });

    const result = {
      groupId: group.id,
      groupName: group.name,
      smartAccountAddress: group.smartAccountAddress,
      balances,
      fetchTimeMs: fetchTime,
      timestamp: new Date().toISOString(),
      cacheCleared: hadCache
    };

    sendSuccess(res, result, 'Balance refreshed successfully');
  } catch (error: any) {
    console.error('❌ [BALANCE REFRESH DEBUG] refreshGroupBalanceHandler error:', error);
    sendServerError(res, error?.message || 'Failed to refresh group balance');
  }
};