import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.js';
import { getAddressBalance } from '../services/openfortService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Basic health check endpoint
 * GET /health
 */
export const healthCheckHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    const healthData = {
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'connected',
        openfort: process.env.OPENFORT_API_SECRET_KEY ? 'configured' : 'not_configured'
      }
    };

    sendSuccess(res, healthData);
  } catch (error) {
    console.error('Health check failed:', error);
    sendError(res, 'Health check failed', 503);
  }
};

/**
 * Blockchain connectivity health check
 * GET /health/blockchain
 */
export const blockchainHealthHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthData: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      blockchain: {
        chainId: process.env.OPENFORT_CHAIN_ID || '11155111',
        rpcUrl: process.env.SEPOLIA_RPC_URL ? 'configured' : 'not_configured',
        openfort: {
          configured: !!process.env.OPENFORT_API_SECRET_KEY,
          environment: process.env.OPENFORT_ENVIRONMENT || 'sandbox'
        }
      }
    };

    // Test blockchain connectivity by checking a known address balance
    const testAddress = '0x0000000000000000000000000000000000000000'; // Zero address
    try {
      const balance = await getAddressBalance(testAddress);
      healthData.blockchain.connectivity = 'ok';
      healthData.blockchain.testBalance = balance;
    } catch (error) {
      console.warn('Blockchain connectivity test failed:', error);
      healthData.blockchain.connectivity = 'error';
      healthData.blockchain.error = error instanceof Error ? error.message : 'Unknown error';
      healthData.status = 'degraded';
    }

    // Test database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthData.database = 'connected';
    } catch (error) {
      console.error('Database connectivity test failed:', error);
      healthData.database = 'error';
      healthData.status = 'error';
    }

    const statusCode = healthData.status === 'error' ? 503 : 200;
    res.status(statusCode).json({
      success: healthData.status !== 'error',
      data: healthData
    });
  } catch (error) {
    console.error('Blockchain health check failed:', error);
    sendError(res, 'Blockchain health check failed', 503);
  }
};