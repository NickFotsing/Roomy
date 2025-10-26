import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { transactionLimiter } from '../middleware/rateLimiter.js';
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

// All transaction routes require authentication and have transaction-specific rate limiting
router.use(authenticate);
router.use(transactionLimiter);

// Transaction management
router.post('/', validate(createTransactionValidation), createTransactionHandler);
router.get('/:transactionId', validate(getTransactionValidation), getTransactionByIdHandler);

// Openfort integration endpoints
router.get('/intent/:intentId/status', getTransactionIntentStatusHandler);

export default router;