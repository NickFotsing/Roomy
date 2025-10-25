import { PrismaClient, Transaction, TransactionStatus, TransactionType } from '@prisma/client';
import { createTransactionIntent, ensureWalletForUser, amountToWei } from './openfortService.js';

const prisma = new PrismaClient();

export interface CreateTransactionInput {
  billId?: string;
  groupId?: string;
  receiverId?: string;
  amount: number;
  currency?: string;
  description?: string;
  type: TransactionType;
  metadata?: Record<string, any>;
  toAddress?: string; // Blockchain address for the transaction
}

export const createTransaction = async (
  userId: string,
  input: CreateTransactionInput
): Promise<Transaction & { openfortIntentId: string | undefined }> => {
  // Validate required fields
  if (!input.amount || input.amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  // Validate blockchain address if provided
  if (input.toAddress && !isValidAddress(input.toAddress)) {
    throw new Error('Invalid blockchain address format');
  }

  // Resolve groupId if only billId is provided
  let groupId = input.groupId;
  if (!groupId && input.billId) {
    const bill = await prisma.bill.findUnique({ where: { id: input.billId } });
    if (!bill) throw new Error('Bill not found');
    groupId = bill.groupId;
  }

  if (!groupId) {
    throw new Error('Group ID is required (directly or via bill)');
  }

  // Ensure user is a member of the group
  const membership = await prisma.groupMember.findFirst({
    where: { userId, groupId, isActive: true }
  });

  if (!membership) {
    throw new Error('Unauthorized: Not a member of the group');
  }

  // Get user's email for wallet provisioning
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  let openfortIntentId: string | undefined;

  // Create Openfort transaction intent if toAddress is provided
  if (input.toAddress) {
    try {
      // Ensure user has a wallet
      const wallet = await ensureWalletForUser(userId, user.email);
      
      // Convert amount to wei based on currency
      const valueInWei = amountToWei(input.amount, input.currency || 'USDC');
      
      // Resolve chainId from environment, defaulting to Arbitrum Sepolia (421614)
      const intentChainId: number = Number(process.env.OPENFORT_CHAIN_ID || 421614);
      
      // Create transaction intent
      const intent = await createTransactionIntent({
        playerId: wallet.openfortPlayerId,
        to: input.toAddress,
        value: valueInWei,
        chainId: intentChainId, // Arbitrum Sepolia
        metadata: {
          ...input.metadata,
          transactionType: input.type,
          description: input.description,
          groupId,
          billId: input.billId,
        },
      });

      openfortIntentId = intent.id;
    } catch (error) {
      console.error('Failed to create Openfort transaction intent:', error);
      throw new Error('Failed to create blockchain transaction intent');
    }
  }

  // Create transaction record in database
  const tx = await prisma.transaction.create({
    data: {
      billId: input.billId || null,
      groupId,
      receiverId: input.receiverId || null,
      amount: input.amount,
      currency: input.currency || 'USDC',
      status: TransactionStatus.PENDING,
      type: input.type,
      description: input.description || null,
      metadata: input.metadata ? JSON.stringify({
        ...input.metadata,
        openfortIntentId,
        toAddress: input.toAddress,
      }) : JSON.stringify({
        openfortIntentId,
        toAddress: input.toAddress,
      }),
      senderId: userId,
    }
  });

  return {
    ...tx,
    openfortIntentId: openfortIntentId || undefined,
  };
};

// Utility function to validate Ethereum addresses
function isValidAddress(address: string): boolean {
  // Basic Ethereum address validation (0x followed by 40 hex characters)
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
}

export const getTransactionsByGroup = async (
  groupId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ transactions: Transaction[]; total: number }> => {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where: { groupId } })
  ]);

  return { transactions, total };
};

export const getTransactionById = async (
  transactionId: string
): Promise<Transaction | null> => {
  return prisma.transaction.findUnique({ where: { id: transactionId } });
};