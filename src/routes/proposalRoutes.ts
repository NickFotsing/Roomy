import { Router } from 'express';
import { authenticate, requireGroupMembership } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { 
  createProposalHandler,
  getGroupProposalsHandler,
  getProposalByIdHandler,
  voteOnProposalHandler,
  executeProposalHandler
} from '../controllers/proposalController.js';
import { 
  createProposalValidation,
  voteOnProposalValidation,
  getProposalValidation
} from '../validators/proposalValidators.js';

const router = Router();

// All proposal routes require authentication
router.use(authenticate);

/**
 * Create a new proposal for a bill
 * POST /api/proposals
 */
router.post('/', 
  validate(createProposalValidation),
  createProposalHandler
);

/**
 * Get proposals for a group
 * GET /api/groups/:groupId/proposals
 */
router.get('/groups/:groupId', 
  requireGroupMembership('groupId'),
  getGroupProposalsHandler
);

/**
 * Get proposal by ID
 * GET /api/proposals/:proposalId
 */
router.get('/:proposalId', 
  validate(getProposalValidation),
  getProposalByIdHandler
);

/**
 * Vote on a proposal
 * POST /api/proposals/:proposalId/votes
 */
router.post('/:proposalId/votes', 
  validate(voteOnProposalValidation),
  voteOnProposalHandler
);

/**
 * Execute a proposal
 * POST /api/proposals/:proposalId/execute
 */
router.post('/:proposalId/execute', 
  validate(getProposalValidation),
  executeProposalHandler
);

export default router;