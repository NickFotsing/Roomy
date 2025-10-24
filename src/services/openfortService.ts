import { PrismaClient } from '@prisma/client';
import config from '../config/config.js';
import crypto from 'crypto';
import { fetch, Headers } from 'undici';

const prisma = new PrismaClient();

const OPENFORT_BASE_URL = 'https://api.openfort.xyz/v1';

interface OpenfortPlayer {
  id: string;
  email?: string;
}

interface OpenfortWallet {
  id: string;
  address: string;
  chainId?: number;
}

const hasOpenfortConfig = (): boolean => {
  return Boolean(config.openfort?.apiKey);
};

const authHeaders = (): Headers => {
  return new Headers({
    'Authorization': `Bearer ${config.openfort.apiKey}`,
    'Content-Type': 'application/json',
  });
};

async function createPlayer(email: string): Promise<OpenfortPlayer> {
  const res = await fetch(`${OPENFORT_BASE_URL}/players`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Openfort createPlayer failed: ${res.status} ${text}`);
  }
  return await res.json() as OpenfortPlayer;
}

async function createEmbeddedWallet(playerId: string): Promise<OpenfortWallet> {
  const res = await fetch(`${OPENFORT_BASE_URL}/wallets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ playerId, type: 'embedded' }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Openfort createEmbeddedWallet failed: ${res.status} ${text}`);
  }
  return await res.json() as OpenfortWallet;
}

function mockPlayer(email: string): OpenfortPlayer {
  return {
    id: `player_${crypto.randomUUID()}`,
    email,
  };
}

function mockWallet(): OpenfortWallet {
  const randomHex = crypto.randomBytes(20).toString('hex');
  return {
    id: `wallet_${crypto.randomUUID()}`,
    address: `0x${randomHex}`,
    chainId: 80002,
  };
}

export async function ensureWalletForUser(userId: string, email: string): Promise<{ openfortPlayerId: string; address: string; chainId: number; id: string; }> {
  // Return existing wallet if present
  const existing = await prisma.wallet.findUnique({
    where: { userId },
    select: { id: true, address: true, chainId: true, openfortPlayerId: true }
  });

  if (existing) {
    return {
      id: existing.id,
      address: existing.address,
      chainId: existing.chainId ?? 80002,
      openfortPlayerId: existing.openfortPlayerId,
    };
  }

  // Create via Openfort or mock
  let player: OpenfortPlayer;
  let wallet: OpenfortWallet;

  if (hasOpenfortConfig()) {
    player = await createPlayer(email);
    wallet = await createEmbeddedWallet(player.id);
  } else {
    // Fallback mock for local/dev when API key not provided
    player = mockPlayer(email);
    wallet = mockWallet();
  }

  // Persist wallet
  const saved = await prisma.wallet.create({
    data: {
      userId,
      openfortPlayerId: player.id,
      address: wallet.address,
      chainId: wallet.chainId ?? 80002,
      isActive: true,
    },
    select: { id: true, address: true, chainId: true, openfortPlayerId: true }
  });

  return {
    id: saved.id,
    address: saved.address,
    chainId: saved.chainId ?? 80002,
    openfortPlayerId: saved.openfortPlayerId,
  };
}