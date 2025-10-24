import { Router } from 'express';
import { authenticate, requireGroupMembership, requireGroupRole } from '../middleware/auth.js';
import { MemberRole } from '@prisma/client';

const router = Router();

// All bill routes require authentication
router.use(authenticate);

/**
 * Create a new bill
 * POST /api/bills
 * Access: Group members (groupId in body)
 * Note: Bill creation requires group membership
 */
router.post('/', requireGroupMembership(), (req, res) => {
  res.status(200).json({ 
    message: 'Create bill endpoint',
    note: 'User is a member of the specified group'
  });
});

/**
 * Get all bills for the authenticated user
 * GET /api/bills
 * Access: Authenticated users (returns bills from their groups)
 */
router.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Get user bills endpoint',
    userId: req.user?.userId,
    note: 'Returns bills from all groups the user belongs to'
  });
});

/**
 * Get bill by ID
 * GET /api/bills/:billId
 * Access: Members of the group that owns the bill
 * Note: In a full implementation, you'd verify group membership via the bill's groupId
 */
router.get('/:billId', (req, res) => {
  res.status(200).json({ 
    message: `Get bill with ID: ${req.params.billId}`,
    note: 'Should verify user is member of the group that owns this bill'
  });
});

/**
 * Update bill
 * PUT /api/bills/:billId
 * Access: Bill creator or group admins
 * Note: In full implementation, check if user is bill creator or group admin
 */
router.put('/:billId', (req, res) => {
  res.status(200).json({ 
    message: `Update bill with ID: ${req.params.billId}`,
    note: 'Should verify user is bill creator or group admin'
  });
});

/**
 * Delete bill
 * DELETE /api/bills/:billId
 * Access: Bill creator or group admins
 */
router.delete('/:billId', (req, res) => {
  res.status(200).json({ 
    message: `Delete bill with ID: ${req.params.billId}`,
    note: 'Should verify user is bill creator or group admin'
  });
});

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