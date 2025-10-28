import { Router } from 'express';
import * as twoFactorController from '../controllers/twoFactorController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All 2FA routes require authentication
router.use(authenticate);

// Setup 2FA (generates QR code and backup codes)
router.post('/setup', twoFactorController.setup2FA);

// Verify 2FA setup (enables 2FA after successful verification)
router.post('/verify-setup', twoFactorController.verify2FASetup);

// Verify 2FA token (for login or sensitive operations)
router.post('/verify', twoFactorController.verify2FAToken);

// Disable 2FA
router.post('/disable', twoFactorController.disable2FA);

// Generate new backup codes
router.post('/backup-codes', twoFactorController.generateNewBackupCodes);

export default router;