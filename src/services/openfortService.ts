import { PrismaClient } from "@prisma/client";
import config from "../config/config.js";
import crypto from "crypto";
import { fetch, Headers } from "undici";

const prisma = new PrismaClient();

const OPENFORT_BASE_URL = "https://api.openfort.xyz/v1";
const DEFAULT_CHAIN_ID = Number(process.env.OPENFORT_CHAIN_ID || 42161);

interface OpenfortPlayer {
  id: string;
  email?: string;
}

interface OpenfortWallet {
  id: string;
  address: string;
  chainId?: number;
}

// Transaction Intent Types
interface OpenfortTransactionIntent {
  id: string;
  status: "pending" | "completed" | "failed";
  transactionHash?: string;
  chainId: number;
  to: string;
  value: string;
  data?: string;
  playerId: string;
}

interface CreateTransactionIntentRequest {
  playerId: string;
  to: string;
  value: string; // Amount in wei
  chainId?: number;
  data?: string;
  metadata?: Record<string, any>;
}

const hasOpenfortConfig = (): boolean => {
  // Only allow server-side API calls when a Secret Key is configured
  return Boolean(config.openfort?.secretKey);
};

const authHeaders = (): Headers => {
  const key = config.openfort.secretKey;
  if (!key) {
    throw new Error("Openfort secret key not configured (OPENFORT_API_SECRET_KEY)");
  }
  return new Headers({
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  });
};

async function createPlayer(email?: string): Promise<OpenfortPlayer> {
  const res = await fetch(`${OPENFORT_BASE_URL}/players`, {
    method: "POST",
    headers: authHeaders(),
    // Openfort API rejects "email" in body; create player with empty payload
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Openfort createPlayer failed: ${res.status} ${text}`);
  }
  return (await res.json()) as OpenfortPlayer;
}

async function createEmbeddedWallet(playerId: string): Promise<OpenfortWallet> {
  const res = await fetch(`${OPENFORT_BASE_URL}/accounts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ 
      player: playerId,
      chainId: DEFAULT_CHAIN_ID,
      accountType: 'Upgradeable'
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Openfort createEmbeddedWallet failed: ${res.status} ${text}`);
  }
  
  return await res.json() as OpenfortWallet;
}

export async function ensureWalletForUser(
  userId: string,
  email: string
): Promise<{
  openfortPlayerId: string;
  address: string;
  chainId: number;
  id: string;
}> {
  const existing = await prisma.wallet.findUnique({
    where: { userId },
    select: { id: true, address: true, chainId: true, openfortPlayerId: true },
  });

  if (existing) {
    return {
      id: existing.id,
      address: existing.address,
      chainId: existing.chainId ?? DEFAULT_CHAIN_ID,
      openfortPlayerId: existing.openfortPlayerId,
    };
  }

  let player: OpenfortPlayer;
  let wallet: OpenfortWallet;

  if (hasOpenfortConfig()) {
    try {
      player = await createPlayer();
      wallet = await createEmbeddedWallet(player.id);
    } catch (err) {
      console.error('Openfort wallet provisioning failed:', err);
      // Check if we're in development mode
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) {
        // Fallback to local dummy wallet in development
        player = { id: `player_${crypto.randomUUID()}`, email };
        const randomHex = crypto.randomBytes(20).toString("hex");
        wallet = {
          id: `wallet_${crypto.randomUUID()}`,
          address: `0x${randomHex}`,
          chainId: DEFAULT_CHAIN_ID,
        };
      } else {
        throw err;
      }
    }
  } else {
    // No Openfort secret configured: use local dummy wallet
    player = { id: `player_${crypto.randomUUID()}`, email };
    const randomHex = crypto.randomBytes(20).toString("hex");
    wallet = {
      id: `wallet_${crypto.randomUUID()}`,
      address: `0x${randomHex}`,
      chainId: DEFAULT_CHAIN_ID,
    };
  }

  const saved = await prisma.wallet.create({
    data: {
      userId,
      openfortPlayerId: player.id,
      address: wallet.address,
      chainId: wallet.chainId ?? DEFAULT_CHAIN_ID,
      isActive: true,
    },
    select: { id: true, address: true, chainId: true, openfortPlayerId: true },
  });

  return {
    id: saved.id,
    address: saved.address,
    chainId: saved.chainId ?? DEFAULT_CHAIN_ID,
    openfortPlayerId: saved.openfortPlayerId,
  };
}

function cryptoRandomHex(length: number): string {
  const alphabet = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < length; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const createGroupSmartAccount = async (groupName: string): Promise<{ address: string }> => {
  if (!hasOpenfortConfig()) {
    const addr = `0x${cryptoRandomHex(40)}`;
    return { address: addr };
  }

  const player = await createPlayer();
  const account = await createEmbeddedWallet(player.id);
  return { address: account.address };
};

export async function createTransactionIntent(
  request: CreateTransactionIntentRequest
): Promise<OpenfortTransactionIntent> {
  if (!hasOpenfortConfig()) {
    const intent: OpenfortTransactionIntent = {
      id: `intent_${crypto.randomUUID()}`,
      status: "pending" as const,
      chainId: request.chainId || DEFAULT_CHAIN_ID,
      to: request.to,
      value: request.value,
      playerId: request.playerId,
    };

    if (request.data !== undefined) {
      intent.data = request.data;
    }
    return intent;
  }

  const res = await fetch(`${OPENFORT_BASE_URL}/transaction_intents`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      player: request.playerId,
      to: request.to,
      value: request.value,
      chainId: request.chainId || DEFAULT_CHAIN_ID,
      data: request.data || "0x",
      metadata: request.metadata,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Openfort createTransactionIntent failed: ${res.status} ${text}`
    );
  }

  return (await res.json()) as OpenfortTransactionIntent;
}

// REMOVED DUPLICATE - Keep only this one
export async function getTransactionIntent(
  intentId: string
): Promise<OpenfortTransactionIntent> {
  if (!hasOpenfortConfig()) {
    return {
      id: intentId,
      status: "completed",
      transactionHash: `0x${cryptoRandomHex(64)}`,
      chainId: DEFAULT_CHAIN_ID,
      to: `0x${cryptoRandomHex(40)}`,
      value: "1000000000000000000",
      playerId: `player_${crypto.randomUUID()}`,
    };
  }

  const res = await fetch(
    `${OPENFORT_BASE_URL}/transaction_intents/${intentId}`,
    {
      method: "GET",
      headers: authHeaders(),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Openfort getTransactionIntent failed: ${res.status} ${text}`
    );
  }

  return (await res.json()) as OpenfortTransactionIntent;
}

// Utility function to convert amount to wei (assuming USDC with 6 decimals or ETH with 18 decimals)
export function amountToWei(amount: number, currency: string = "USDC"): string {
  const decimals = currency === "USDC" ? 6 : 18; // USDC has 6 decimals, ETH has 18
  const multiplier = Math.pow(10, decimals);
  return Math.floor(amount * multiplier).toString();
}

// Utility function to convert wei back to readable amount
export function weiToAmount(wei: string, currency: string = "USDC"): number {
  const decimals = currency === "USDC" ? 6 : 18;
  const divisor = Math.pow(10, decimals);
  return parseInt(wei) / divisor;
}

// Provide an address balance helper compatible with DEFAULT_CHAIN_ID
export const getAddressBalance = async (address: string): Promise<number> => {
  try {
    const rpcByChain: Record<number, string> = {
      80002: "https://polygon-amoy-bor-rpc.publicnode.com",
      421614: "https://sepolia-rollup.arbitrum.io/rpc",
      42161: "https://arb1.arbitrum.io/rpc",
    };
    
    // Get RPC URL with guaranteed fallback to Arbitrum One
    let rpcUrl = rpcByChain[DEFAULT_CHAIN_ID];
    if (!rpcUrl) {
      console.warn(`No RPC URL configured for chainId ${DEFAULT_CHAIN_ID}, falling back to Arbitrum One`);
      rpcUrl = "https://arb1.arbitrum.io/rpc";
    }

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`RPC balance fetch failed: ${res.status} ${text}`);
    }

    const json: any = await res.json();
    const hex: string = json.result;
    if (!hex || typeof hex !== "string") return 0;
    const wei = parseInt(hex, 16);
    const balance = wei / 1e18;
    return balance;
  } catch (e) {
    console.warn("getAddressBalance fallback due to error:", e instanceof Error ? e.message : e);
    return 0;
  }
};