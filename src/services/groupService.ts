import { PrismaClient, MemberRole } from '@prisma/client';
import config from '../config/config.js';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getAddressBalance } from './openfortService.js';
import { createGroupSmartAccount } from './openfortService.js'

const prisma = new PrismaClient();

export interface CreateGroupInput {
  name: string;
  votingThreshold?: number; // 1-100
  memberEmails?: string[]; // optional initial members to add
  smartAccountAddress?: string; // optional client-provided smart account address
}

export interface InviteMembersInput {
  groupId: string;
  inviterUserId: string;
  emails: string[];
}

export const createGroup = async (
  creatorUserId: string,
  input: CreateGroupInput
): Promise<{ id: string; name: string; smartAccountAddress: string | null; votingThreshold: number; members: Array<{ id: string; email: string; username: string; role: MemberRole; }> }> => {
  // Create group record
  const group = await prisma.group.create({
    data: {
      name: input.name,
      votingThreshold: input.votingThreshold ?? 51,
      isActive: true,
    },
  });

  // Determine smart account address: use client-provided or auto-provision
  let smartAccountAddress: string | null = null;
  if (input.smartAccountAddress) {
    smartAccountAddress = input.smartAccountAddress;
  } else {
    try {
      const sa = await createGroupSmartAccount(input.name);
      smartAccountAddress = sa.address;
    } catch (e) {
      console.warn('Failed to provision group smart account:', e instanceof Error ? e.message : e);
      smartAccountAddress = null;
    }
  }

  // Persist smart account address if available
  if (smartAccountAddress) {
    await prisma.group.update({
      where: { id: group.id },
      data: { smartAccountAddress },
    });
  }

  // Add creator as ADMIN
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: creatorUserId } },
    update: { role: MemberRole.ADMIN, isActive: true },
    create: {
      groupId: group.id,
      userId: creatorUserId,
      role: MemberRole.ADMIN,
      isActive: true,
    },
  });

  // Add optional members by email as MEMBER
  if (input.memberEmails && input.memberEmails.length > 0) {
    const uniqueEmails = Array.from(new Set(input.memberEmails.map(e => e.toLowerCase())));
    const users = await prisma.user.findMany({
      where: { email: { in: uniqueEmails } },
      select: { id: true, email: true, username: true },
    });

    await Promise.all(
      users.map(u =>
        prisma.groupMember.upsert({
          where: { groupId_userId: { groupId: group.id, userId: u.id } },
          update: { role: MemberRole.MEMBER, isActive: true },
          create: { groupId: group.id, userId: u.id, role: MemberRole.MEMBER, isActive: true },
        })
      )
    );
  }

  // Return group with members
  const members = await prisma.groupMember.findMany({
    where: { groupId: group.id, isActive: true },
    include: {
      user: { select: { id: true, email: true, username: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return {
    id: group.id,
    name: group.name,
    smartAccountAddress,
    votingThreshold: group.votingThreshold,
    members: members.map(m => ({ id: m.user.id, email: m.user.email, username: m.user.username, role: m.role })),
  };
};

export const inviteMembers = async (
  input: InviteMembersInput
): Promise<{ invites: Array<{ email: string; token: string; link: string; }> }> => {
  // Verify inviter has ADMIN role
  const membership = await prisma.groupMember.findFirst({
    where: { groupId: input.groupId, userId: input.inviterUserId, isActive: true },
    select: { role: true },
  });

  if (!membership || membership.role !== MemberRole.ADMIN) {
    throw new Error('Only group admins can invite members');
  }

  const secret = config.invites.tokenSecret;
  const options: SignOptions = {
    expiresIn: config.invites.tokenExpiration as unknown as number,
    issuer: 'roomy-api',
    audience: 'roomy-client',
  };

  const invites = input.emails.map(email => {
    const payload = { groupId: input.groupId, email: email.toLowerCase() };
    const token = jwt.sign(payload, secret, options);
    const link = `${config.frontendUrl}/groups/${input.groupId}/join?token=${token}`;
    return { email, token, link };
  });

  return { invites };
};

export const joinGroupWithToken = async (
  userId: string,
  token: string
): Promise<{ groupId: string; role: MemberRole; }> => {
  const secret = config.invites.tokenSecret;

  let decoded: any;
  try {
    decoded = jwt.verify(token, secret, { issuer: 'roomy-api', audience: 'roomy-client' });
  } catch (e) {
    throw new Error('Invalid or expired invite token');
  }

  const groupId: string = decoded.groupId;
  const email: string = decoded.email;

  // Verify authenticated user's email matches the invited email
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) {
    throw new Error('User not found');
  }
  if (user.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Invite token does not match your account');
  }

  // Add membership as MEMBER
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId } },
    update: { role: MemberRole.MEMBER, isActive: true },
    create: { groupId, userId, role: MemberRole.MEMBER, isActive: true },
  });

  return { groupId, role: MemberRole.MEMBER };
};

export const getGroupDetails = async (
  groupId: string
): Promise<{ id: string; name: string; description: string | null; votingThreshold: number; smartAccountAddress: string | null; balance: number | null; isActive: boolean; createdAt: Date; updatedAt: Date; members: Array<{ id: string; email: string; username: string; role: MemberRole; }> }> => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, description: true, smartAccountAddress: true, votingThreshold: true, isActive: true, createdAt: true, updatedAt: true },
  });

  if (!group || !group.isActive) {
    throw new Error('Group not found or inactive');
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId, isActive: true },
    include: { user: { select: { id: true, email: true, username: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  let balance: number | null = null;
  if (group.smartAccountAddress) {
    try {
      balance = await getAddressBalance(group.smartAccountAddress);
    } catch (e) {
      console.warn(
        'Failed to fetch smart account balance:',
        e instanceof Error ? e.message : e
      );
      balance = 0;
    }
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    votingThreshold: group.votingThreshold,
    smartAccountAddress: group.smartAccountAddress,
    balance,
    isActive: group.isActive,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    members: members.map(m => ({ id: m.user.id, email: m.user.email, username: m.user.username, role: m.role })),
  };
};