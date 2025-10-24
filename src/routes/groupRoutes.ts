import { Router } from 'express';
import { authenticate, requireGroupMembership, requireGroupRole } from '../middleware/auth.js';
import { MemberRole } from '@prisma/client';

const router = Router();

// All group routes require authentication
router.use(authenticate);

/**
 * Create a new group
 * POST /api/groups
 * Access: Any authenticated user
 */
router.post('/', (req, res) => {
  res.status(200).json({ 
    message: 'Create group endpoint',
    note: 'Will be implemented with group controller'
  });
});

/**
 * Get all user's groups
 * GET /api/groups
 * Access: Authenticated users (returns their own groups)
 */
router.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Get user groups endpoint',
    userId: req.user?.userId
  });
});

/**
 * Get group by ID
 * GET /api/groups/:groupId
 * Access: Group members only
 */
router.get('/:groupId', requireGroupMembership('groupId'), (req, res) => {
  res.status(200).json({ 
    message: `Get group with ID: ${req.params.groupId}`,
    note: 'User is a member of this group'
  });
});

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
  requireGroupMembership('groupId'),
  (req, res) => {
    res.status(200).json({ 
      message: `Get bills for group: ${req.params.groupId}`
    });
  }
);

export default router;