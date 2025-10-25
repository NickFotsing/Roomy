import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { updateProfileValidation } from '../validators/authValidators.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// User profile routes
router.get('/profile', userController.getUserGroups); // Get current user's groups
router.put('/profile', validate(updateProfileValidation), userController.updateProfile);
router.delete('/account', userController.deleteAccount);

// Specific routes (must come before parameterized routes)
router.get('/groups', userController.getUserGroups); // Get user's groups
router.get('/wallet', userController.getUserWallet); // Get user's wallet
router.post('/wallet/provision', userController.provisionWallet); // Provision user's wallet

// Notification routes
router.get('/notifications', userController.getUserNotifications);
router.put('/notifications/:notificationId/read', userController.markNotificationAsRead);
router.put('/notifications/read-all', userController.markAllNotificationsAsRead);

// Parameterized routes (must come last)
router.get('/:userId', userController.getUserById); // Get user by ID

export default router;
