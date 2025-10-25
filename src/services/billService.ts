import { PrismaClient, Bill, BillStatus, BillItem } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateBillInput {
  groupId: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency?: string;
  dueDate?: Date;
  payeeAddress: string;
  categoryId?: string;
  attachmentUrl?: string;
  items?: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
}

export interface UpdateBillInput {
  title?: string;
  description?: string;
  totalAmount?: number;
  currency?: string;
  dueDate?: Date;
  payeeAddress?: string;
  categoryId?: string;
  attachmentUrl?: string;
  status?: BillStatus;
  items?: Array<{
    id?: string;
    description: string;
    amount: number;
    quantity?: number;
  }>;
}

export const createBill = async (
  userId: string,
  billData: CreateBillInput
): Promise<Bill & { items: BillItem[] }> => {
  const { items, ...billFields } = billData;

  // Build the data object conditionally to avoid undefined values
  const createData: any = {
    ...billFields,
    description: billFields.description ?? null,
    dueDate: billFields.dueDate ?? null,
    categoryId: billFields.categoryId ?? null,
    attachmentUrl: billFields.attachmentUrl ?? null,
    createdBy: userId,
  };

  // Only add items if they exist
  if (items && items.length > 0) {
    createData.items = {
      create: items.map(item => ({
        description: item.description,
        amount: item.amount,
        quantity: item.quantity || 1,
      }))
    };
  }

  const bill = await prisma.bill.create({
    data: createData,
    include: {
      items: true,
      creator: {
        select: { id: true, username: true, email: true }
      },
      category: {
        select: { id: true, name: true, color: true }
      }
    }
  });

  return bill;
};

export const getBillsByGroup = async (
  groupId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ bills: Array<Bill & { items: BillItem[], creator: any, category: any }>; total: number }> => {
  const skip = (page - 1) * limit;

  const [bills, total] = await Promise.all([
    prisma.bill.findMany({
      where: { groupId, status: { not: 'CANCELLED' } },
      include: {
        items: true,
        creator: {
          select: { id: true, username: true, email: true }
        },
        category: {
          select: { id: true, name: true, color: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.bill.count({
      where: { groupId, status: { not: 'CANCELLED' } }
    })
  ]);

  return { bills, total };
};

export const getBillById = async (
  billId: string
): Promise<(Bill & { items: BillItem[], creator: any, category: any, group: any }) | null> => {
  return await prisma.bill.findUnique({
    where: { id: billId },
    include: {
      items: true,
      creator: {
        select: { id: true, username: true, email: true }
      },
      category: {
        select: { id: true, name: true, color: true }
      },
      group: {
        select: { id: true, name: true }
      },
      proposal: {
        include: {
          votes: {
            include: {
              voter: {
                select: { id: true, username: true }
              }
            }
          }
        }
      },
      transactions: {
        include: {
          sender: {
            select: { id: true, username: true }
          }
        }
      }
    }
  });
};

export const updateBill = async (
  billId: string,
  userId: string,
  updateData: UpdateBillInput
): Promise<Bill & { items: BillItem[] }> => {
  // First check if user can update this bill
  const existingBill = await prisma.bill.findUnique({
    where: { id: billId },
    include: {
      group: {
        include: {
          members: {
            where: { userId, isActive: true }
          }
        }
      }
    }
  });

  if (!existingBill) {
    throw new Error('Bill not found');
  }

  const userMembership = existingBill.group.members[0];
  const isCreator = existingBill.createdBy === userId;
  const isAdmin = userMembership?.role === 'ADMIN';

  if (!isCreator && !isAdmin) {
    throw new Error('Unauthorized to update this bill');
  }

  const { items, ...billFields } = updateData;

  // Build update data object
  const updateData_data: any = {
    updatedAt: new Date(),
  };

  // Conditionally assign fields to avoid passing undefined
  if (billFields.title !== undefined) updateData_data.title = billFields.title;
  if (billFields.description !== undefined) updateData_data.description = billFields.description ?? null;
  if (billFields.totalAmount !== undefined) updateData_data.totalAmount = billFields.totalAmount;
  if (billFields.currency !== undefined) updateData_data.currency = billFields.currency;
  if (billFields.dueDate !== undefined) updateData_data.dueDate = billFields.dueDate ?? null;
  if (billFields.payeeAddress !== undefined) updateData_data.payeeAddress = billFields.payeeAddress;
  if (billFields.categoryId !== undefined) updateData_data.categoryId = billFields.categoryId ?? null;
  if (billFields.attachmentUrl !== undefined) updateData_data.attachmentUrl = billFields.attachmentUrl ?? null;
  if (billFields.status !== undefined) updateData_data.status = billFields.status;

  // Handle items replacement if provided
  if (items) {
    updateData_data.items = {
      deleteMany: {},
      create: items.map(item => ({
        description: item.description,
        amount: item.amount,
        quantity: item.quantity || 1,
      }))
    };
  }

  const updatedBill = await prisma.bill.update({
    where: { id: billId },
    data: updateData_data,
    include: {
      items: true,
      creator: {
        select: { id: true, username: true, email: true }
      },
      category: {
        select: { id: true, name: true, color: true }
      }
    }
  });

  return updatedBill;
};

export const deleteBill = async (
  billId: string,
  userId: string
): Promise<void> => {
  // Check if user can delete this bill
  const existingBill = await prisma.bill.findUnique({
    where: { id: billId },
    include: {
      group: {
        include: {
          members: {
            where: { userId, isActive: true }
          }
        }
      }
    }
  });

  if (!existingBill) {
    throw new Error('Bill not found');
  }

  const userMembership = existingBill.group.members[0];
  const isCreator = existingBill.createdBy === userId;
  const isAdmin = userMembership?.role === 'ADMIN';

  if (!isCreator && !isAdmin) {
    throw new Error('Unauthorized to delete this bill');
  }

  // Soft delete by setting status to CANCELLED
  await prisma.bill.update({
    where: { id: billId },
    data: { status: 'CANCELLED', updatedAt: new Date() }
  });
};

export const getUserBills = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ bills: Array<Bill & { items: BillItem[], creator: any, category: any, group: any }>; total: number }> => {
  const skip = (page - 1) * limit;

  // Get bills from groups the user is a member of
  const [bills, total] = await Promise.all([
    prisma.bill.findMany({
      where: {
        group: {
          members: {
            some: {
              userId,
              isActive: true
            }
          }
        },
        status: { not: 'CANCELLED' }
      },
      include: {
        items: true,
        creator: {
          select: { id: true, username: true, email: true }
        },
        category: {
          select: { id: true, name: true, color: true }
        },
        group: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.bill.count({
      where: {
        group: {
          members: {
            some: {
              userId,
              isActive: true
            }
          }
        },
        status: { not: 'CANCELLED' }
      }
    })
  ]);

  return { bills, total };
};