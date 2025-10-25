import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  createTransactionHandler,
  getTransactionByIdHandler,
  getTransactionIntentStatusHandler
} from '../controllers/transactionController.js';
import {
  createTransactionValidation,
  getTransactionValidation
} from '../validators/transactionValidators.js';

const router = Router();

// All transaction routes require authentication
router.use(authenticate);

/**
 * Create a new transaction
 * POST /api/transactions
 */
router.post('/', 
  validate(createTransactionValidation),
  createTransactionHandler
);

/**
 * Get transaction by ID
 * GET /api/transactions/:transactionId
 */
router.get('/:transactionId', 
  validate(getTransactionValidation),
  getTransactionByIdHandler
);

/**
 * Get transaction intent status
 * GET /api/transactions/intent/:intentId/status
 */
router.get('/intent/:intentId/status', 
  getTransactionIntentStatusHandler
);

export default router;