import express from 'express';
import { authenticate, requireGroupMembership } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getGroupRecurringValidation,
  createRecurringValidation,
  updateRecurringValidation,
} from '../validators/recurringValidators.js';
import {
  getGroupRecurringHandler,
  createRecurringHandler,
  updateRecurringHandler,
  deleteRecurringHandler,
  processRecurringHandler,
} from '../controllers/recurringController.js';

const router = express.Router();

// All recurring routes require authentication
router.use(authenticate);

router.get('/groups/:groupId/recurring', 
  validate(getGroupRecurringValidation),
  requireGroupMembership('groupId'),
  getGroupRecurringHandler
);

router.post('/recurring', 
  validate(createRecurringValidation),
  createRecurringHandler
);

router.patch('/recurring/:recurringId', 
  validate(updateRecurringValidation),
  updateRecurringHandler
);

router.delete('/recurring/:recurringId', 
  validate(updateRecurringValidation),
  deleteRecurringHandler
);

// Internal/utility endpoint to trigger processing due schedules (could be cron in production)
router.post('/recurring/process', processRecurringHandler);

export default router;