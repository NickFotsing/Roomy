import { Request, Response } from 'express';
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendForbidden } from '../utils/response.js';
import { createTransaction, getTransactionsByGroup, getTransactionById, CreateTransactionInput } from '../services/transactionService.js';
import { getTransactionIntent } from '../services/openfortService.js';
import { TransactionType } from '@prisma/client';

export const createTransactionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const input: CreateTransactionInput = req.body;
    if (!input.amount || !input.type) {
      sendError(res, 'Missing required fields: amount, type', 422);
      return;
    }

    if (!Object.values(TransactionType).includes(input.type)) {
      sendError(res, 'Invalid transaction type', 422);
      return;
    }

    const transaction = await createTransaction(userId, input);
    
    // Return response in the format expected by frontend: { transaction }
    sendSuccess(res, { transaction }, 'Transaction created successfully', 201);
  } catch (error) {
    console.error('Error creating transaction:', error);
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        sendForbidden(res, error.message);
      } else if (error.message.includes('Invalid')) {
        sendError(res, error.message, 422);
      } else {
        sendError(res, error.message);
      }
    } else {
      sendError(res, 'Failed to create transaction');
    }
  }
};

export const getGroupTransactionsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!groupId) {
      sendError(res, 'Group ID is required', 422);
      return;
    }

    const result = await getTransactionsByGroup(groupId, page, limit);
    sendSuccess(res, {
      transactions: result.transactions,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    }, 'Group transactions retrieved successfully');
  } catch (error) {
    console.error('Error getting group transactions:', error);
    sendError(res, 'Failed to retrieve group transactions');
  }
};

export const getTransactionByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId } = req.params;
    if (!transactionId) {
      sendError(res, 'Transaction ID is required', 422);
      return;
    }

    const tx = await getTransactionById(transactionId);
    if (!tx) {
      sendNotFound(res, 'Transaction not found');
      return;
    }

    sendSuccess(res, { transaction: tx }, 'Transaction retrieved successfully');
  } catch (error) {
    console.error('Error getting transaction:', error);
    sendError(res, 'Failed to retrieve transaction');
  }
};

export const getTransactionIntentStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { intentId } = req.params;
    if (!intentId) {
      sendError(res, 'Intent ID is required', 422);
      return;
    }

    const intent = await getTransactionIntent(intentId);
    if (!intent) {
      sendNotFound(res, 'Transaction intent not found');
      return;
    }

    sendSuccess(res, { intent }, 'Transaction intent status retrieved successfully');
  } catch (error) {
    console.error('Error getting transaction intent status:', error);
    if (error instanceof Error && error.message.includes('failed')) {
      sendError(res, error.message);
    } else {
      sendError(res, 'Failed to retrieve transaction intent status');
    }
  }
};