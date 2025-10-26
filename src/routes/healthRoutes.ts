import { Router } from 'express';
import { healthCheckHandler, blockchainHealthHandler } from '../controllers/healthController.js';

const router = Router();

// Basic health check
router.get('/', healthCheckHandler);

// Blockchain connectivity health check
router.get('/blockchain', blockchainHealthHandler);

export default router;