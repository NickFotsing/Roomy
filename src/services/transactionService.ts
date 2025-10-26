import { PrismaClient, Transaction, TransactionStatus, TransactionType } from '@prisma/client';
import { createTransactionIntent, ensureWalletForUser, amountToWei, generateERC20TransferData } from './openfortService.js';

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
): Promise<Transaction & { openfortIntentId: string | null }> => {
  // Validate required fields
  if (!input.amount || input.amount <= 0) {
    throw new Error('Amount must be a positive number');
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

  // If this is a DEPOSIT and no toAddress provided, default to group's smart account address
  if (input.type === TransactionType.DEPOSIT && !input.toAddress) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { smartAccountAddress: true }
    });
    if (!group || !group.smartAccountAddress) {
      throw new Error('Group smart account address is not set; cannot perform on-chain deposit');
    }
    input.toAddress = group.smartAccountAddress;
  }

  // Validate blockchain address if provided (after possible defaulting above)
  if (input.toAddress && !isValidAddress(input.toAddress)) {
    throw new Error('Invalid blockchain address format');
  }

  let openfortIntentId: string | undefined;

  // Create Openfort transaction intent when we have a destination address (native or token transfer)
  if (input.toAddress) {
    try {
      // Ensure user has a wallet
      const wallet = await ensureWalletForUser(userId, user.email);

      // Use Sepolia testnet as configured in environment
      const intentChainId: number = Number(process.env.OPENFORT_CHAIN_ID || 11155111);

      const currency = input.currency || 'ETH';

      // Decide between native transfer vs ERC-20 transfer
      let toForIntent = input.toAddress; // destination for native transfers
      let valueForIntent = '0';
      let dataForIntent: string | undefined = '0x';

      if (currency === 'ETH' || currency === 'MATIC') {
        // Native token transfer: send value with empty data
        valueForIntent = amountToWei(input.amount, currency);
        dataForIntent = '0x';
      } else if (currency === 'USDC') {
        // ERC-20 transfer: allow token contract address via metadata.tokenAddress, fallback to env
        const usdcAddressFromReq = input.metadata && typeof input.metadata === 'object'
          ? (input.metadata as Record<string, any>).tokenAddress as string | undefined
          : undefined;
        const usdcAddress = usdcAddressFromReq ?? process.env.OPENFORT_USDC_CONTRACT_ADDRESS;
        if (!usdcAddress || !isValidAddress(usdcAddress)) {
          throw new Error('USDC deposit not configured: provide metadata.tokenAddress or set OPENFORT_USDC_CONTRACT_ADDRESS');
        }
        // For ERC-20, the intent "to" must be the token contract, value=0, data=encoded transfer(toAddress, amount)
        toForIntent = usdcAddress;
        valueForIntent = '0';
        const amountWei = amountToWei(input.amount, 'USDC');
        // Use the improved ERC-20 transfer data generator from openfortService
        dataForIntent = generateERC20TransferData(input.toAddress, amountWei);
      } else {
        throw new Error(`Unsupported currency for on-chain deposit: ${currency}`);
      }

      // Create transaction intent
      const intent = await createTransactionIntent({
        accountId: wallet.openfortAccountId || wallet.openfortPlayerId, // Use accountId if available, fallback to playerId for compatibility
        to: toForIntent,
        value: valueForIntent,
        chainId: intentChainId,
        data: dataForIntent,
        metadata: {
          ...input.metadata,
          transactionType: input.type,
          description: input.description,
          groupId,
          billId: input.billId,
          currency,
        },
      });

      openfortIntentId = intent.id;
    } catch (error) {
      console.error('Failed to create Openfort transaction intent:', error);
      if (error instanceof Error) {
        throw error;
      }
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
      currency: input.currency || 'ETH',
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
    openfortIntentId: openfortIntentId || null,
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