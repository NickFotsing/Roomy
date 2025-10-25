import { Request, Response } from 'express';
import { sendSuccess, sendError, sendForbidden, sendNotFound } from '../utils/response.js';
import { createProposal, getGroupProposals, getProposalById, voteOnProposal, executeProposal, CreateProposalInput } from '../services/proposalService.js';
import { VoteType } from '@prisma/client';

export const createProposalHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const input: CreateProposalInput = req.body;
    if (!input.billId || !input.title || !input.votingDeadline) {
      sendError(res, 'Missing required fields: billId, title, votingDeadline', 422);
      return;
    }

    const proposal = await createProposal(userId, input);
    sendSuccess(res, proposal, 'Proposal created successfully', 201);
  } catch (error) {
    console.error('Error creating proposal:', error);
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        sendForbidden(res, error.message);
      } else {
        sendError(res, error.message);
      }
    } else {
      sendError(res, 'Failed to create proposal');
    }
  }
};

export const getGroupProposalsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    if (!groupId) {
      sendError(res, 'Group ID is required', 422);
      return;
    }

    const proposals = await getGroupProposals(groupId);
    sendSuccess(res, proposals, 'Group proposals retrieved successfully');
  } catch (error) {
    console.error('Error getting group proposals:', error);
    sendError(res, 'Failed to retrieve group proposals');
  }
};

export const getProposalByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proposalId } = req.params;
    if (!proposalId) {
      sendError(res, 'Proposal ID is required', 422);
      return;
    }

    const proposal = await getProposalById(proposalId);
    if (!proposal) {
      sendNotFound(res, 'Proposal not found');
      return;
    }

    sendSuccess(res, proposal, 'Proposal retrieved successfully');
  } catch (error) {
    console.error('Error getting proposal:', error);
    sendError(res, 'Failed to retrieve proposal');
  }
};

export const voteOnProposalHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { proposalId } = req.params;
    
    // Add this validation
    if (!proposalId) {
      sendError(res, 'Proposal ID is required', 422);
      return;
    }

    const { isApproved, comment } = req.body;

    if (typeof isApproved !== 'boolean') {
      sendError(res, 'Approval status is required', 422);
      return;
    }

    const vote = await voteOnProposal(userId, proposalId, isApproved, comment);
    sendSuccess(res, vote, 'Vote recorded successfully');
  } catch (error) {
    console.error('Error voting on proposal:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendNotFound(res, error.message);
      } else if (error.message.includes('Unauthorized')) {
        sendForbidden(res, error.message);
      } else {
        sendError(res, error.message);
      }
    } else {
      sendError(res, 'Failed to record vote');
    }
  }
};

export const executeProposalHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { proposalId } = req.params;
    
    // Add this validation
    if (!proposalId) {
      sendError(res, 'Proposal ID is required', 422);
      return;
    }

    const executionResult = await executeProposal(userId, proposalId);
    sendSuccess(res, executionResult, 'Proposal executed successfully');
  } catch (error) {
    console.error('Error executing proposal:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendNotFound(res, error.message);
      } else if (error.message.includes('Unauthorized')) {
        sendForbidden(res, error.message);
      } else {
        sendError(res, error.message);
      }
    } else {
      sendError(res, 'Failed to execute proposal');
    }
  }
};