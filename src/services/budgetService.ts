import { PrismaClient, MemberRole, BudgetCategory } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateBudgetCategoryInput {
  groupId: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  monthlyLimit?: number | null; // Decimal(20,8) in DB
}

export interface UpdateBudgetCategoryInput {
  name?: string;
  color?: string | null;
  icon?: string | null;
  monthlyLimit?: number | null;
  isActive?: boolean;
}

export const getCategoriesByGroup = async (
  userId: string,
  groupId: string
): Promise<BudgetCategory[]> => {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId, isActive: true },
    select: { id: true }
  });
  if (!membership) {
    throw new Error('Unauthorized: Not a member of the group');
  }

  return prisma.budgetCategory.findMany({
    where: { groupId, isActive: true },
    orderBy: { createdAt: 'desc' }
  });
};

export const createBudgetCategory = async (
  userId: string,
  input: CreateBudgetCategoryInput
): Promise<BudgetCategory> => {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId: input.groupId, userId, isActive: true },
    select: { role: true }
  });
  if (!membership || membership.role !== MemberRole.ADMIN) {
    throw new Error('Only group admins can create budget categories');
  }

  const created = await prisma.budgetCategory.create({
    data: {
      groupId: input.groupId,
      name: input.name,
      color: input.color ?? null,
      icon: input.icon ?? null,
      monthlyLimit: input.monthlyLimit ?? null,
      isActive: true,
    }
  });
  return created;
};

export const updateBudgetCategory = async (
  userId: string,
  categoryId: string,
  data: UpdateBudgetCategoryInput
): Promise<BudgetCategory> => {
  const category = await prisma.budgetCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, groupId: true }
  });
  if (!category) {
    throw new Error('Budget category not found');
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: category.groupId, userId, isActive: true },
    select: { role: true }
  });
  if (!membership || membership.role !== MemberRole.ADMIN) {
    throw new Error('Only group admins can update budget categories');
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.monthlyLimit !== undefined) updateData.monthlyLimit = data.monthlyLimit;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.budgetCategory.update({
    where: { id: categoryId },
    data: updateData,
  });
  return updated;
};

export const deleteBudgetCategory = async (
  userId: string,
  categoryId: string
): Promise<void> => {
  const category = await prisma.budgetCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, groupId: true }
  });
  if (!category) {
    throw new Error('Budget category not found');
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: category.groupId, userId, isActive: true },
    select: { role: true }
  });
  if (!membership || membership.role !== MemberRole.ADMIN) {
    throw new Error('Only group admins can delete budget categories');
  }

  await prisma.budgetCategory.update({
    where: { id: categoryId },
    data: { isActive: false }
  });
};