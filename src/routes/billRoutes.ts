import { Router } from 'express';
import { authenticate, requireGroupMembership, requireGroupRole } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { MemberRole } from '@prisma/client';
import {
  createBillHandler,
  getGroupBillsHandler,
  getBillByIdHandler,
  updateBillHandler,
  deleteBillHandler,
  getUserBillsHandler
} from '../controllers/billController.js';
import {
  createBillValidation,
  updateBillValidation,
  getBillValidation,
  getGroupBillsValidation,
  getUserBillsValidation
} from '../validators/billValidators.js';

const router = Router();

// All bill routes require authentication
router.use(authenticate);

/**
 * Create a new bill
 * POST /api/bills
 * Access: Group members (groupId in body)
 * Note: Bill creation requires group membership
 */
router.post('/', 
  validate(createBillValidation),
  requireGroupMembership(),
  createBillHandler
);

/**
 * Get all bills for the authenticated user
 * GET /api/bills
 * Access: Authenticated users (returns bills from their groups)
 */
router.get('/', 
  validate(getUserBillsValidation),
  getUserBillsHandler
);

/**
 * Get bill by ID
 * GET /api/bills/:billId
 * Access: Members of the group that owns the bill
 * Note: In a full implementation, you'd verify group membership via the bill's groupId
 */
router.get('/:billId', 
  validate(getBillValidation),
  getBillByIdHandler
);

/**
 * Update bill
 * PATCH /api/bills/:billId
 * Access: Bill creator or group admins
 * Note: In full implementation, check if user is bill creator or group admin
 */
router.patch('/:billId', 
  validate(updateBillValidation),
  updateBillHandler
);

/**
 * Delete bill
 * DELETE /api/bills/:billId
 * Access: Bill creator or group admins
 */
router.delete('/:billId', 
  validate(getBillValidation),
  deleteBillHandler
);

/**
 * Create a proposal for a bill
 * POST /api/bills/:billId/proposal
 * Access: Group members
 */
router.post('/:billId/proposal', (req, res) => {
  res.status(200).json({ 
    message: `Create proposal for bill: ${req.params.billId}`,
    note: 'Requires group membership verification'
  });
});

/**
 * Vote on a bill proposal
 * POST /api/bills/:billId/vote
 * Access: Group members
 */
router.post('/:billId/vote', (req, res) => {
  res.status(200).json({ 
    message: `Vote on bill: ${req.params.billId}`,
    note: 'Requires group membership verification'
  });
});

/**
 * Get bill proposal details
 * GET /api/bills/:billId/proposal
 * Access: Group members
 */
router.get('/:billId/proposal', (req, res) => {
  res.status(200).json({ 
    message: `Get proposal for bill: ${req.params.billId}`
  });
});

/**
 * Get bill payment status/transactions
 * GET /api/bills/:billId/transactions
 * Access: Group members
 */
router.get('/:billId/transactions', (req, res) => {
  res.status(200).json({ 
    message: `Get transactions for bill: ${req.params.billId}`
  });
});

export default router;