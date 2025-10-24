import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateProfileValidation } from '../validators/authValidators';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// User profile routes
router.get('/profile', userController.getUserGroups); // Get current user's groups
router.put('/profile', validate(updateProfileValidation), userController.updateProfile);
router.delete('/account', userController.deleteAccount);

// User-specific routes
router.get('/:userId', userController.getUserById); // Get user by ID
router.get('/groups', userController.getUserGroups); // Get user's groups
router.get('/wallet', userController.getUserWallet); // Get user's wallet

// Notification routes
router.get('/notifications', userController.getUserNotifications);
router.put('/notifications/:notificationId/read', userController.markNotificationAsRead);
router.put('/notifications/read-all', userController.markAllNotificationsAsRead);

export default router;