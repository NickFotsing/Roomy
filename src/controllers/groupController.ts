import { Request, Response } from 'express';
import { sendSuccess, sendError, sendServerError } from '../utils/response.js';
import { createGroup, inviteMembers, joinGroupWithToken, getGroupDetails } from '../services/groupService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const groups = memberships.map((membership: any) => ({
      id: membership.group.id,
      name: membership.group.name,
      description: membership.group.description,
      smartAccountAddress: membership.group.smartAccountAddress,
      votingThreshold: membership.group.votingThreshold,
      isActive: membership.group.isActive,
      createdAt: membership.group.createdAt,
      updatedAt: membership.group.updatedAt,
      // Add user's role in the group
      userRole: membership.role,
      joinedAt: membership.joinedAt,
    }));

    sendSuccess(res, groups, 'Groups retrieved successfully');
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