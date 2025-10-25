import { Router } from 'express';
import { authenticate, requireGroupMembership, requireGroupRole } from '../middleware/auth.js';
import { MemberRole } from '@prisma/client';
import { validate } from '../middleware/validation.js';
import { createGroupValidation, inviteMembersValidation, joinGroupValidation } from '../validators/groupValidators.js';
import { createGroupHandler, inviteMembersHandler, joinGroupHandler, getGroupByIdHandler, getUserGroupsHandler } from '../controllers/groupController.js';
import { getGroupBillsHandler } from '../controllers/billController.js';
import { getGroupBillsValidation } from '../validators/billValidators.js';
import { getGroupProposalsHandler } from '../controllers/proposalController.js';
import { getGroupTransactionsHandler } from '../controllers/transactionController.js';
import { getGroupTransactionsValidation } from '../validators/transactionValidators.js';

const router = Router();

// All group routes require authentication
router.use(authenticate);

/**
 * Create a new group
 * POST /api/groups
 * Access: Any authenticated user
 */
router.post('/', validate(createGroupValidation), createGroupHandler);

/**
 * Get all user's groups
 * GET /api/groups
 * Access: Authenticated users (returns their own groups)
 */
router.get('/', getUserGroupsHandler);

/**
 * Get group by ID
 * GET /api/groups/:groupId
 * Access: Group members only
 */
router.get('/:groupId', requireGroupMembership('groupId'), getGroupByIdHandler);

/**
 * Invite members to group
 * POST /api/groups/:groupId/invite
 * Access: Group admins only
 */
router.post(
  '/:groupId/invite',
  requireGroupRole([MemberRole.ADMIN], 'groupId'),
  validate(inviteMembersValidation),
  inviteMembersHandler
);

/**
 * Join group using invite token
 * POST /api/groups/:groupId/join
 * Access: Authenticated users with valid token
 */
router.post(
  '/:groupId/join',
  validate(joinGroupValidation),
  joinGroupHandler
);

/**
 * Update group details
 * PUT /api/groups/:groupId
 * Access: Group admins only
 */
router.put(
  '/:groupId',
  requireGroupRole([MemberRole.ADMIN], 'groupId'),
  (req, res) => {
    res.status(200).json({ 
      message: `Update group with ID: ${req.params.groupId}`,
      note: 'User has ADMIN role in this group'
    });
  }
);

/**
 * Delete group
 * DELETE /api/groups/:groupId
 * Access: Group admins only
 */
router.delete(
  '/:groupId',
  requireGroupRole([MemberRole.ADMIN], 'groupId'),
  (req, res) => {
    res.status(200).json({ 
      message: `Delete group with ID: ${req.params.groupId}`,
      note: 'User has ADMIN role in this group'
    });
  }
);

/**
 * Get group members
 * GET /api/groups/:groupId/members
 * Access: Group members
 */
router.get(
  '/:groupId/members',
  requireGroupMembership('groupId'),
  (req, res) => {
    res.status(200).json({ 
      message: `Get members of group: ${req.params.groupId}`
    });
  }
);

/**
 * Add member to group
 * POST /api/groups/:groupId/members
 * Access: Group admins only
 */
router.post(
  '/:groupId/members',
  requireGroupRole([MemberRole.ADMIN], 'groupId'),
  (req, res) => {
    res.status(200).json({ 
      message: `Add member to group: ${req.params.groupId}`,
      note: 'Only admins can add members'
    });
  }
);

/**
 * Update member role
 * PUT /api/groups/:groupId/members/:memberId
 * Access: Group admins only
 */
router.put(
  '/:groupId/members/:memberId',
  requireGroupRole([MemberRole.ADMIN], 'groupId'),
  (req, res) => {
    res.status(200).json({ 
      message: `Update member ${req.params.memberId} in group: ${req.params.groupId}`,
      note: 'Only admins can update member roles'
    });
  }
);

/**
 * Remove member from group
 * DELETE /api/groups/:groupId/members/:memberId
 * Access: Group admins only
 */
router.delete(
  '/:groupId/members/:memberId',
  requireGroupRole([MemberRole.ADMIN], 'groupId'),
  (req, res) => {
    res.status(200).json({ 
      message: `Remove member ${req.params.memberId} from group: ${req.params.groupId}`,
      note: 'Only admins can remove members'
    });
  }
);

/**
 * Get group bills
 * GET /api/groups/:groupId/bills
 * Access: Group members
 */
router.get(
  '/:groupId/bills',
  validate(getGroupBillsValidation),
  requireGroupMembership('groupId'),
  getGroupBillsHandler
);

// Group transactions
router.get(
  '/:groupId/transactions',
  validate(getGroupTransactionsValidation),
  requireGroupMembership('groupId'),
  getGroupTransactionsHandler
);

/**
 * Get group proposals
 * GET /api/groups/:groupId/proposals
 * Access: Group members
 */
router.get(
  '/:groupId/proposals',
  requireGroupMembership('groupId'),
  getGroupProposalsHandler
);

export default router;