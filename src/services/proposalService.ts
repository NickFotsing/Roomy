import { PrismaClient, Proposal, ProposalStatus, Vote, VoteType, BillStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateProposalInput {
  billId: string;
  title: string;
  description?: string;
  votingDeadline: Date;
}

export interface VoteOnProposalInput {
  voteType: VoteType;
  comment?: string;
}

export const createProposal = async (
  userId: string,
  data: CreateProposalInput
): Promise<Proposal & { bill: any, creator: any }> => {
  // Verify bill exists and user is a member of the bill's group
  const bill = await prisma.bill.findUnique({
    where: { id: data.billId },
    include: { group: { include: { members: { where: { userId, isActive: true } } } } }
  });

  if (!bill) {
    throw new Error('Bill not found');
  }

  const userMembership = bill.group.members[0];
  if (!userMembership) {
    throw new Error('Unauthorized: Not a member of the bill group');
  }

  // Only allow proposal when bill is not already proposed or beyond
  if (bill.status !== BillStatus.DRAFT) {
    throw new Error('Proposal can only be created from DRAFT bills');
  }

  const proposal = await prisma.proposal.create({
  data: {
    billId: bill.id,
    groupId: bill.groupId,  // Add this line
    createdBy: userId,
    title: data.title,
    description: data.description || null,
    votingDeadline: new Date(data.votingDeadline),
    status: ProposalStatus.PENDING,
  },
  include: {
    bill: {
      select: { id: true, title: true, groupId: true }
    },
    creator: {
      select: { id: true, username: true, email: true }
    }
  }
});

  // Mark bill as PROPOSED
  await prisma.bill.update({
    where: { id: bill.id },
    data: { status: BillStatus.PROPOSED }
  });

  return proposal;
};

export const getGroupProposals = async (
  groupId: string
): Promise<Array<Proposal & { bill: any, creator: any }>> => {
  return prisma.proposal.findMany({
    where: {
      bill: { groupId }
    },
    include: {
      bill: {
        select: { id: true, title: true, groupId: true }
      },
      creator: {
        select: { id: true, username: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getProposalById = async (
  proposalId: string
): Promise<(Proposal & { bill: any, creator: any, votes: Array<Vote & { voter: any }> }) | null> => {
  return prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      bill: {
        select: { id: true, title: true, groupId: true, status: true }
      },
      creator: {
        select: { id: true, username: true }
      },
      votes: {
        include: {
          voter: {
            select: { id: true, username: true }
          }
        }
      }
    }
  });
};

export const voteOnProposal = async (
  userId: string,
  proposalId: string,
  isApproved: boolean,
  comment?: string
): Promise<Vote> => {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      bill: { include: { group: { include: { members: { where: { userId, isActive: true } } } } } }
    }
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  const isMember = proposal.bill.group.members[0];
  if (!isMember) {
    throw new Error('Unauthorized: Not a member of the group');
  }

  const existingVote = await prisma.vote.findUnique({
    where: { proposalId_userId: { proposalId, userId } }
  });

  if (existingVote) {
    throw new Error('You have already voted on this proposal');
  }

  // Map boolean approval to VoteType
  const voteType = isApproved ? VoteType.FOR : VoteType.AGAINST;

  const createdVote = await prisma.vote.create({
    data: {
      proposalId,
      userId,
      voteType,
      comment: comment ?? null,
    }
  });

  // Update tallies based on voteType
  const updates: Partial<Proposal> = {} as any;
  if (voteType === VoteType.FOR) updates.votesFor = proposal.votesFor + 1;
  if (voteType === VoteType.AGAINST) updates.votesAgainst = proposal.votesAgainst + 1;

  const updated = await prisma.proposal.update({
    where: { id: proposalId },
    data: updates as any
  });

  // Check threshold and update status
  const group = await prisma.group.findUnique({ where: { id: proposal.bill.groupId } });
  if (group) {
    const totalVotes = updated.votesFor + updated.votesAgainst + updated.votesAbstain;
    const yesPct = totalVotes > 0 ? (updated.votesFor / totalVotes) * 100 : 0;
    if (yesPct >= group.votingThreshold) {
      await prisma.proposal.update({ where: { id: proposalId }, data: { status: ProposalStatus.APPROVED } });
      await prisma.bill.update({ where: { id: proposal.billId }, data: { status: BillStatus.APPROVED } });
    }
  }

  return createdVote;
}

export const executeProposal = async (
  userId: string,
  proposalId: string
): Promise<Proposal> => {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { bill: true }
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  // Only creator or group admin should execute; check membership role
  const membership = await prisma.groupMember.findFirst({
    where: { groupId: proposal.bill.groupId, userId, isActive: true }
  });

  if (!membership) {
    throw new Error('Unauthorized: Not a member of the group');
  }

  // Mark as executed
  const executed = await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: ProposalStatus.EXECUTED, executedAt: new Date() }
  });

  return executed;
};