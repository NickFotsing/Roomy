import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { sendValidationError } from '../utils/response.js';

/**
 * Middleware to handle validation errors from express-validator
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors: Record<string, string[]> = {};
    
    errors.array().forEach((error) => {
      if (error.type === 'field') {
        const field = error.path;
        if (!formattedErrors[field]) {
          formattedErrors[field] = [];
        }
        formattedErrors[field].push(error.msg);
      }
    });

    sendValidationError(res, formattedErrors);
    return;
  }

  next();
};

/**
 * Helper to run validation chains
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Debug logging
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
    
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    handleValidationErrors(req, res, next);
  };
};

