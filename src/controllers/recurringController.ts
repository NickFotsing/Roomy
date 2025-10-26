import { Request, Response } from 'express';
import {
  createRecurringBillSchedule,
  updateRecurringBillSchedule,
  deleteRecurringBillSchedule,
  getRecurringByGroup,
  processDueRecurringBills,
} from '../services/recurringService.js';

export const getGroupRecurringHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const { groupId } = req.params;
    if (!groupId) {
      res.status(422).json({ success: false, message: 'Group ID is required' });
      return;
    }

    const list = await getRecurringByGroup(userId, groupId);
    res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    res.status(403).json({ success: false, message: err.message || 'Forbidden' });
  }
};

export const createRecurringHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const created = await createRecurringBillSchedule(userId, req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    const message = err.message || 'Failed to create recurring bill';
    const status = message.includes('admins') ? 403 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const updateRecurringHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const { recurringId } = req.params;
    if (!recurringId) {
      res.status(422).json({ success: false, message: 'Recurring ID is required' });
      return;
    }

    const updated = await updateRecurringBillSchedule(userId, recurringId, req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    const message = err.message || 'Failed to update recurring bill';
    const status = message.includes('admins') ? 403 : 404;
    res.status(status).json({ success: false, message });
  }
};

export const deleteRecurringHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const { recurringId } = req.params;
    if (!recurringId) {
      res.status(422).json({ success: false, message: 'Recurring ID is required' });
      return;
    }

    await deleteRecurringBillSchedule(userId, recurringId);
    res.status(204).send();
  } catch (err: any) {
    const message = err.message || 'Failed to delete recurring bill';
    const status = message.includes('admins') ? 403 : 404;
    res.status(status).json({ success: false, message });
  }
};

export const processRecurringHandler = async (_req: Request, res: Response) => {
  try {
    const result = await processDueRecurringBills();
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to process recurring bills' });
  }
};