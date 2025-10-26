import { Request, Response } from 'express';
import { sendSuccess, sendError, sendForbidden, sendNotFound } from '../utils/response.js';
import {
  getCategoriesByGroup,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  CreateBudgetCategoryInput,
  UpdateBudgetCategoryInput
} from '../services/budgetService.js';

export const getGroupCategoriesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    // Add validation for groupId
    if (!groupId) {
      sendError(res, 'Group ID is required', 422);
      return;
    }

    const categories = await getCategoriesByGroup(userId, groupId);
    sendSuccess(res, { categories }, 'Group categories retrieved successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      sendForbidden(res, error.message);
      return;
    }
    sendError(res, error instanceof Error ? error.message : 'Failed to get categories');
  }
};

export const createCategoryHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const input: CreateBudgetCategoryInput = {
      groupId: req.body.groupId,
      name: req.body.name,
      color: req.body.color ?? null,
      icon: req.body.icon ?? null,
      monthlyLimit: req.body.monthlyLimit ?? null,
    };

    const category = await createBudgetCategory(userId, input);
    sendSuccess(res, { category }, 'Category created successfully', 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Only group admins')) {
      sendForbidden(res, error.message);
      return;
    }
    sendError(res, error instanceof Error ? error.message : 'Failed to create category');
  }
};

export const updateCategoryHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { categoryId } = req.params;
    
    // Add validation for categoryId
    if (!categoryId) {
      sendError(res, 'Category ID is required', 422);
      return;
    }

    const input: UpdateBudgetCategoryInput = {
      name: req.body.name,
      color: req.body.color ?? null,
      icon: req.body.icon ?? null,
      monthlyLimit: req.body.monthlyLimit ?? null,
      isActive: req.body.isActive,
    };

    const category = await updateBudgetCategory(userId, categoryId, input);
    sendSuccess(res, { category }, 'Category updated successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('Only group admins')) {
      sendForbidden(res, error.message);
      return;
    }
    sendError(res, error instanceof Error ? error.message : 'Failed to update category');
  }
};

export const deleteCategoryHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { categoryId } = req.params;
    
    // Add validation for categoryId
    if (!categoryId) {
      sendError(res, 'Category ID is required', 422);
      return;
    }

    await deleteBudgetCategory(userId, categoryId);
    sendSuccess(res, {}, 'Category deleted successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('Only group admins')) {
      sendForbidden(res, error.message);
      return;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      sendNotFound(res, error.message);
      return;
    }
    sendError(res, error instanceof Error ? error.message : 'Failed to delete category');
  }
};