import { Request, Response } from 'express';
import { sendSuccess, sendError, sendNotFound, sendForbidden } from '../utils/response.js';
import {
  createBill,
  getBillsByGroup,
  getBillById,
  updateBill,
  deleteBill,
  getUserBills,
  CreateBillInput,
  UpdateBillInput
} from '../services/billService.js';

export const createBillHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const billData: CreateBillInput = req.body;

    // Validate required fields
    if (!billData.groupId || !billData.title || !billData.totalAmount || !billData.payeeAddress) {
      sendError(res, 'Missing required fields: groupId, title, totalAmount, payeeAddress', 422);
      return;
    }

    const bill = await createBill(userId, billData);
    sendSuccess(res, bill, 'Bill created successfully', 201);
  } catch (error) {
    console.error('Error creating bill:', error);
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('not a member')) {
        sendForbidden(res, error.message);
      } else {
        sendError(res, error.message);
      }
    } else {
      sendError(res, 'Failed to create bill');
    }
  }
};

export const getGroupBillsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!groupId) {
      sendError(res, 'Group ID is required', 422);
      return;
    }

    const result = await getBillsByGroup(groupId, page, limit);
    sendSuccess(res, {
      bills: result.bills,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    }, 'Group bills retrieved successfully');
  } catch (error) {
    console.error('Error getting group bills:', error);
    sendError(res, 'Failed to retrieve group bills');
  }
};

export const getBillByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { billId } = req.params;

    if (!billId) {
      sendError(res, 'Bill ID is required', 422);
      return;
    }

    const bill = await getBillById(billId);
    if (!bill) {
      sendNotFound(res, 'Bill not found');
      return;
    }

    sendSuccess(res, bill, 'Bill retrieved successfully');
  } catch (error) {
    console.error('Error getting bill:', error);
    sendError(res, 'Failed to retrieve bill');
  }
};

export const updateBillHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { billId } = req.params;
    const updateData: UpdateBillInput = req.body;

    if (!billId) {
      sendError(res, 'Bill ID is required', 422);
      return;
    }

    const bill = await updateBill(billId, userId, updateData);
    sendSuccess(res, bill, 'Bill updated successfully');
  } catch (error) {
    console.error('Error updating bill:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendNotFound(res, error.message);
      } else if (error.message.includes('Unauthorized')) {
        sendForbidden(res, error.message);
      } else {
        sendError(res, error.message);
      }
    } else {
      sendError(res, 'Failed to update bill');
    }
  }
};

export const deleteBillHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { billId } = req.params;

    if (!billId) {
      sendError(res, 'Bill ID is required', 422);
      return;
    }

    await deleteBill(billId, userId);
    sendSuccess(res, null, 'Bill deleted successfully');
  } catch (error) {
    console.error('Error deleting bill:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        sendNotFound(res, error.message);
      } else if (error.message.includes('Unauthorized')) {
        sendForbidden(res, error.message);
      } else {
        sendError(res, error.message);
      }
    } else {
      sendError(res, 'Failed to delete bill');
    }
  }
};

export const getUserBillsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await getUserBills(userId, page, limit);
    sendSuccess(res, {
      bills: result.bills,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    }, 'User bills retrieved successfully');
  } catch (error) {
    console.error('Error getting user bills:', error);
    sendError(res, 'Failed to retrieve user bills');
  }
};