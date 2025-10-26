import { Router } from 'express';
import { authenticate, requireGroupMembership } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { getGroupCategoriesHandler, createCategoryHandler, updateCategoryHandler, deleteCategoryHandler } from '../controllers/budgetController.js';
import { getGroupCategoriesValidation, createCategoryValidation, updateCategoryValidation } from '../validators/budgetValidators.js';

const router = Router();

router.use(authenticate);

// Get categories for a group
router.get('/groups/:groupId/categories',
  validate(getGroupCategoriesValidation),
  requireGroupMembership('groupId'),
  getGroupCategoriesHandler
);

// Create a category (admin check in service)
router.post('/categories',
  validate(createCategoryValidation),
  createCategoryHandler
);

// Update a category (admin check in service)
router.patch('/categories/:categoryId',
  validate(updateCategoryValidation),
  updateCategoryHandler
);

// Delete a category (admin check in service)
router.delete('/categories/:categoryId',
  validate(updateCategoryValidation),
  deleteCategoryHandler
);

export default router;