import { PrismaClient, MemberRole, RecurringBill, RecurringFrequency } from '@prisma/client';
import { CreateBillInput, createBill } from './billService.js';
import { createProposal } from './proposalService.js';

const prisma = new PrismaClient();

export interface CreateRecurringInput {
  groupId: string;
  title: string;
  description?: string | null;
  amount: number; // Decimal
  currency?: string;
  payeeAddress: string;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date | null;
  autoPropose?: boolean;
  categoryId?: string | null;
}

export interface UpdateRecurringInput {
  title?: string;
  description?: string | null;
  amount?: number;
  currency?: string;
  payeeAddress?: string;
  frequency?: RecurringFrequency;
  startDate?: Date;
  nextDueDate?: Date;
  endDate?: Date | null;
  isActive?: boolean;
  autoPropose?: boolean;
  categoryId?: string | null;
}

export const computeNextDueDate = (from: Date, frequency: RecurringFrequency): Date => {
  const d = new Date(from);
  switch (frequency) {
    case 'DAILY': d.setDate(d.getDate() + 1); break;
    case 'WEEKLY': d.setDate(d.getDate() + 7); break;
    case 'BIWEEKLY': d.setDate(d.getDate() + 14); break;
    case 'MONTHLY': d.setMonth(d.getMonth() + 1); break;
    case 'QUARTERLY': d.setMonth(d.getMonth() + 3); break;
    case 'YEARLY': d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1); break;
  }
  return d;
};

export const getRecurringByGroup = async (
  userId: string,
  groupId: string
): Promise<RecurringBill[]> => {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId, isActive: true },
    select: { id: true }
  });
  if (!membership) {
    throw new Error('Unauthorized: Not a member of the group');
  }

  return prisma.recurringBill.findMany({
    where: { groupId, isActive: true },
    orderBy: { nextDueDate: 'asc' }
  });
};

export const createRecurringBillSchedule = async (
  userId: string,
  input: CreateRecurringInput
): Promise<RecurringBill> => {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId: input.groupId, userId, isActive: true },
    select: { role: true }
  });
  if (!membership || membership.role !== MemberRole.ADMIN) {
    throw new Error('Only group admins can create recurring bills');
  }

  const nextDueDate = computeNextDueDate(input.startDate, input.frequency);

  const created = await prisma.recurringBill.create({
    data: {
      groupId: input.groupId,
      title: input.title,
      description: input.description ?? null,
      amount: input.amount,
      currency: input.currency || 'USDC',
      payeeAddress: input.payeeAddress,
      frequency: input.frequency,
      startDate: input.startDate,
      nextDueDate,
      endDate: input.endDate ?? null,
      isActive: true,
      autoPropose: input.autoPropose ?? true,
      categoryId: input.categoryId ?? null,
    }
  });

  return created;
};

export const updateRecurringBillSchedule = async (
  userId: string,
  recurringId: string,
  data: UpdateRecurringInput
): Promise<RecurringBill> => {
  const existing = await prisma.recurringBill.findUnique({
    where: { id: recurringId },
    select: { id: true, groupId: true, frequency: true, nextDueDate: true }
  });
  if (!existing) {
    throw new Error('Recurring bill not found');
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: existing.groupId, userId, isActive: true },
    select: { role: true }
  });
  if (!membership || membership.role !== MemberRole.ADMIN) {
    throw new Error('Only group admins can update recurring bills');
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.payeeAddress !== undefined) updateData.payeeAddress = data.payeeAddress;
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.startDate !== undefined) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.autoPropose !== undefined) updateData.autoPropose = data.autoPropose;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

  // Allow manual override of nextDueDate, else recompute when frequency/startDate changes
  let nextDue = existing.nextDueDate;
  if (data.nextDueDate !== undefined) {
    nextDue = data.nextDueDate;
  } else if (data.frequency || data.startDate) {
    const base = data.startDate || existing.nextDueDate || new Date();
    nextDue = computeNextDueDate(base, data.frequency || existing.frequency);
  }
  updateData.nextDueDate = nextDue;

  const updated = await prisma.recurringBill.update({
    where: { id: recurringId },
    data: updateData,
  });
  return updated;
};

export const deleteRecurringBillSchedule = async (
  userId: string,
  recurringId: string
): Promise<void> => {
  const existing = await prisma.recurringBill.findUnique({
    where: { id: recurringId },
    select: { id: true, groupId: true }
  });
  if (!existing) {
    throw new Error('Recurring bill not found');
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: existing.groupId, userId, isActive: true },
    select: { role: true }
  });
  if (!membership || membership.role !== MemberRole.ADMIN) {
    throw new Error('Only group admins can delete recurring bills');
  }

  await prisma.recurringBill.update({
    where: { id: recurringId },
    data: { isActive: false }
  });
};

export const processDueRecurringBills = async (): Promise<{ processed: number }> => {
  const now = new Date();
  const due = await prisma.recurringBill.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gt: now } }
      ]
    },
    select: {
      id: true, groupId: true, title: true, description: true, amount: true, currency: true,
      payeeAddress: true, frequency: true, nextDueDate: true, autoPropose: true, categoryId: true
    }
  });

  let processed = 0;
  for (const r of due) {
    try {
      // pick an admin as creator
      const admin = await prisma.groupMember.findFirst({
        where: { groupId: r.groupId, role: MemberRole.ADMIN, isActive: true },
        select: { userId: true }
      });
      if (!admin) {
        console.warn(`No admin found for group ${r.groupId}; skipping recurring ${r.id}`);
        continue;
      }

      // Build the bill input conditionally
      const billInput: CreateBillInput = {
        groupId: r.groupId,
        title: r.title,
        totalAmount: Number(r.amount),
        currency: r.currency,
        payeeAddress: r.payeeAddress,
        items: [{ description: r.title, amount: Number(r.amount), quantity: 1 }]
      };

      // Only add optional properties if they have values
      if (r.description !== null) {
        billInput.description = r.description;
      }
      if (r.nextDueDate) {
        billInput.dueDate = r.nextDueDate;  // Changed from r.dueDate to r.nextDueDate
      }
      if (r.categoryId !== null) {
        billInput.categoryId = r.categoryId;
      }

      const bill = await createBill(admin.userId, billInput);

      if (r.autoPropose) {
        const votingDeadline = new Date();
        votingDeadline.setDate(votingDeadline.getDate() + 7);
        await createProposal(admin.userId, {
          billId: bill.id,
          title: `Approve: ${r.title}`,
          description: r.description ?? '',
          votingDeadline,
        });
      }

      // Update nextDueDate for the recurring schedule
      const next = computeNextDueDate(r.nextDueDate, r.frequency);
      await prisma.recurringBill.update({
        where: { id: r.id },
        data: { nextDueDate: next }
      });
      processed++;
    } catch (e) {
      console.error('Failed to process recurring bill', r.id, e);
    }
  }

  return { processed };
};