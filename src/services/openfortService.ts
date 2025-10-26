import { PrismaClient } from "@prisma/client";
import config from "../config/config.js";
import crypto from "crypto";
import { fetch, Headers } from "undici";

const prisma = new PrismaClient();

const OPENFORT_BASE_URL = "https://api.openfort.xyz/v1";
const DEFAULT_CHAIN_ID = Number(process.env.OPENFORT_CHAIN_ID || 11155111);

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
  accountId: string;
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
  console.log('Creating embedded wallet for player:', playerId);
  
  const res = await fetch(`${OPENFORT_BASE_URL}/accounts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ 
      player: playerId,
      chainId: DEFAULT_CHAIN_ID,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Openfort createEmbeddedWallet failed: ${res.status} ${text}`);
  }
  
  const account = await res.json() as any;
  console.log('Openfort account response:', JSON.stringify(account, null, 2));
  
  // The account ID should be in the response - log it to verify
  return {
    id: account.id, // This should be like "acc_..." not "wallet_..."
    address: account.address,
    chainId: account.chainId,
  };
}

export async function ensureWalletForUser(
  userId: string,
  email: string
): Promise<{
  openfortPlayerId: string;
  openfortAccountId: string | null;
  address: string;
  chainId: number;
  id: string;
}> {
  const existing = await prisma.wallet.findUnique({
    where: { userId },
    select: { id: true, address: true, chainId: true, openfortPlayerId: true, openfortAccountId: true },
  });

  if (existing) {
    return {
      id: existing.id,
      address: existing.address,
      chainId: existing.chainId ?? DEFAULT_CHAIN_ID,
      openfortPlayerId: existing.openfortPlayerId,
      openfortAccountId: existing.openfortAccountId,
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

  // Only save real Openfort account IDs (starting with "acc_"), not mock wallet IDs
  const openfortAccountId = wallet.id.startsWith('acc_') ? wallet.id : null;
  
  console.log(`Saving wallet - ID: ${wallet.id}, Account ID to save: ${openfortAccountId}`);

  const saved = await prisma.wallet.create({
    data: {
      userId,
      openfortPlayerId: player.id,
      openfortAccountId: openfortAccountId, // Only save real acc_* IDs
      address: wallet.address,
      chainId: wallet.chainId ?? DEFAULT_CHAIN_ID,
      isActive: true,
    },
    select: { id: true, address: true, chainId: true, openfortPlayerId: true, openfortAccountId: true },
  });

  return {
    id: saved.id,
    address: saved.address,
    chainId: saved.chainId ?? DEFAULT_CHAIN_ID,
    openfortPlayerId: saved.openfortPlayerId,
    openfortAccountId: saved.openfortAccountId,
  };
}

function cryptoRandomHex(length: number): string {
  // Use cryptographic randomness to avoid any chance of collisions
  const bytes = Math.ceil(length / 2);
  return crypto.randomBytes(bytes).toString("hex").slice(0, length);
}

// Also update createGroupSmartAccount
export const createGroupSmartAccount = async (groupName: string): Promise<{ address: string }> => {
  if (!hasOpenfortConfig()) {
    const addr = `0x${cryptoRandomHex(40)}`;
    return { address: addr };
  }

  try {
    const player = await createPlayer();
    const account = await createEmbeddedWallet(player.id);
    return { address: account.address };
  } catch (err) {
    console.error('Openfort group smart account provisioning failed:', err);
    if (config.nodeEnv === 'development') {
      // Fallback to local dummy smart account address in development
      const addr = `0x${cryptoRandomHex(40)}`;
      return { address: addr };
    }
    throw err;
  }
};

// Generate ERC-20 transfer data for USDC transactions
function generateERC20TransferData(toAddress: string, amount: string): string {
  // ERC-20 transfer function signature: transfer(address,uint256)
  const functionSelector = '0xa9059cbb'; // transfer(address,uint256)
  
  // Pad address to 32 bytes (remove 0x prefix, pad to 64 chars, add back 0x)
  const paddedAddress = toAddress.slice(2).padStart(64, '0');
  
  // Convert amount to hex and pad to 32 bytes
  const amountBigInt = BigInt(amount);
  const paddedAmount = amountBigInt.toString(16).padStart(64, '0');
  
  return functionSelector + paddedAddress + paddedAmount;
}

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
      playerId: request.accountId,
    };

    if (request.data !== undefined) {
      intent.data = request.data;
    }
    return intent;
  }

  console.log('Creating transaction intent with accountId:', request.accountId);

  // Determine if we should use player or account field based on ID format
  let payload: any;
  
  if (request.accountId.startsWith('player_')) {
    // Use player field for player IDs
    payload = {
      player: request.accountId,
      chainId: request.chainId || DEFAULT_CHAIN_ID,
      interactions: [
        {
          to: request.to,
          value: request.value,
        },
      ],
    };
  } else if (request.accountId.startsWith('acc_')) {
    // Use account field for account IDs
    payload = {
      account: request.accountId,
      chainId: request.chainId || DEFAULT_CHAIN_ID,
      interactions: [
        {
          to: request.to,
          value: request.value,
        },
      ],
    };
  } else {
    throw new Error(`Invalid account ID format: ${request.accountId}. Expected 'player_*' or 'acc_*'`);
  }

  // Add data field for ERC-20 transfers or custom contract calls
  if (request.data) {
    payload.interactions[0].data = request.data;
  }
  
  console.log('Transaction intent payload:', JSON.stringify(payload, null, 2));

  const res = await fetch(`${OPENFORT_BASE_URL}/transaction_intents`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Transaction intent error:', text);
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
export function amountToWei(amount: number, currency: string = "ETH"): string {
  const decimals = currency === "USDC" ? 6 : 18; // USDC has 6 decimals, ETH has 18
  const multiplier = Math.pow(10, decimals);
  return Math.floor(amount * multiplier).toString();
}

// Utility function to convert wei back to readable amount
export function weiToAmount(wei: string, currency: string = "ETH"): number {
  const decimals = currency === "USDC" ? 6 : 18;
  const divisor = Math.pow(10, decimals);
  return parseInt(wei) / divisor;
}

// Export the ERC-20 transfer data generator
export { generateERC20TransferData };

// Token contract addresses by chain ID
const TOKEN_CONTRACTS: Record<number, Record<string, string>> = {
  11155111: { // Sepolia
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC on Sepolia
  },
  80002: { // Polygon Amoy
    USDC: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582", // USDC on Polygon Amoy
  },
  421614: { // Arbitrum Sepolia
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC on Arbitrum Sepolia
  },
  42161: { // Arbitrum One
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC on Arbitrum One
  }
};

// Utility function to validate Ethereum address format
const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Utility function to encode ERC-20 balanceOf function call
const encodeBalanceOfCall = (address: string): string => {
  // balanceOf(address) function selector: 0x70a08231
  const functionSelector = "70a08231";
  // Pad address to 32 bytes (remove 0x prefix and pad with zeros)
  const paddedAddress = address.slice(2).padStart(64, '0');
  return `0x${functionSelector}${paddedAddress}`;
};

// Utility function to decode ERC-20 balance result
const decodeBalanceResult = (result: string, decimals: number = 18): number => {
  if (!result || result === "0x") return 0;
  
  // Remove 0x prefix and convert hex to number
  const hex = result.startsWith('0x') ? result.slice(2) : result;
  const wei = parseInt(hex, 16);
  const divisor = Math.pow(10, decimals);
  
  return wei / divisor;
};

// Function to fetch ERC-20 token balance
const getTokenBalance = async (address: string, tokenSymbol: string, rpcUrls: string[]): Promise<number> => {
  const tokenContracts = TOKEN_CONTRACTS[DEFAULT_CHAIN_ID];
  if (!tokenContracts || !tokenContracts[tokenSymbol]) {
    console.warn(`⚠️ [TOKEN BALANCE DEBUG] No ${tokenSymbol} contract found for chainId ${DEFAULT_CHAIN_ID}`);
    return 0;
  }

  const tokenContract = tokenContracts[tokenSymbol];
  const callData = encodeBalanceOfCall(address);
  const decimals = tokenSymbol === "USDC" ? 6 : 18;

  console.log(`🪙 [TOKEN BALANCE DEBUG] Fetching ${tokenSymbol} balance for address: ${address}`);
  console.log(`🪙 [TOKEN BALANCE DEBUG] Token contract: ${tokenContract}`);
  console.log(`🪙 [TOKEN BALANCE DEBUG] Call data: ${callData}`);

  // Try each RPC endpoint until one succeeds
  for (let i = 0; i < rpcUrls.length; i++) {
    const rpcUrl = rpcUrls[i]!;
    
    try {
      console.log(`🚀 [TOKEN BALANCE DEBUG] Attempting ${tokenSymbol} balance fetch from RPC ${i + 1}/${rpcUrls.length}: ${rpcUrl}`);
      
      const requestPayload = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          {
            to: tokenContract,
            data: callData
          },
          "latest"
        ],
      };
      
      console.log(`🔍 [TOKEN BALANCE DEBUG] Request payload:`, JSON.stringify(requestPayload, null, 2));
      
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "Roomy-Backend/1.0"
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      console.log(`🔍 [TOKEN BALANCE DEBUG] RPC response status: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const text = await res.text();
        console.warn(`⚠️ [TOKEN BALANCE DEBUG] RPC ${rpcUrl} failed with status ${res.status}: ${text}`);
        continue;
      }

      const json: any = await res.json();
      console.log(`🔍 [TOKEN BALANCE DEBUG] RPC response:`, JSON.stringify(json, null, 2));
      
      if (json.error) {
        console.warn(`⚠️ [TOKEN BALANCE DEBUG] RPC ${rpcUrl} returned JSON-RPC error:`, json.error);
        continue;
      }

      const result: string = json.result;
      if (!result) {
        console.warn(`⚠️ [TOKEN BALANCE DEBUG] RPC ${rpcUrl} returned empty result`);
        continue;
      }

      console.log(`🔍 [TOKEN BALANCE DEBUG] Raw ${tokenSymbol} balance hex: ${result}`);
      
      const balance = decodeBalanceResult(result, decimals);
      console.log(`✅ [TOKEN BALANCE DEBUG] Successfully fetched ${tokenSymbol} balance from ${rpcUrl}: ${balance} ${tokenSymbol}`);
      
      return balance;
      
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.warn(`❌ [TOKEN BALANCE DEBUG] RPC ${rpcUrl} failed with error: ${errorMsg}`);
      
      if (i === rpcUrls.length - 1) {
        console.error(`❌ [TOKEN BALANCE DEBUG] All RPC endpoints failed for ${tokenSymbol} balance fetch`);
      }
      continue;
    }
  }

  console.error(`❌ [TOKEN BALANCE DEBUG] getTokenBalance failed for ${tokenSymbol} at address ${address} on chainId ${DEFAULT_CHAIN_ID}`);
  return 0;
};

// Balance response interface
export interface BalanceResponse {
  eth: number;
  usdc: number;
  totalUsd?: number; // Optional USD value calculation
}

// Updated balance helper that fetches both ETH and USDC
export const getAddressBalances = async (address: string): Promise<BalanceResponse> => {
  console.log(`🔍 [BALANCE DEBUG] Starting multi-token balance fetch for address: ${address}`);
  console.log(`🔍 [BALANCE DEBUG] Using chainId: ${DEFAULT_CHAIN_ID}`);
  
  // Validate address format first
  if (!address) {
    console.error(`❌ [BALANCE DEBUG] Address is empty or null`);
    return { eth: 0, usdc: 0 };
  }
  
  if (!isValidEthereumAddress(address)) {
    console.error(`❌ [BALANCE DEBUG] Invalid Ethereum address format: ${address}`);
    return { eth: 0, usdc: 0 };
  }
  
  console.log(`✅ [BALANCE DEBUG] Address format is valid`);
  
  // Define reliable RPC endpoints with fallbacks for each chain
  const rpcByChain: Record<number, string[]> = {
    80002: [
      "https://polygon-amoy-bor-rpc.publicnode.com",
      "https://rpc-amoy.polygon.technology",
      "https://polygon-amoy.drpc.org"
    ],
    421614: [
      "https://sepolia-rollup.arbitrum.io/rpc",
      "https://arbitrum-sepolia.drpc.org",
      "https://arbitrum-sepolia.publicnode.com"
    ],
    42161: [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum.drpc.org",
      "https://arbitrum.publicnode.com"
    ],
    11155111: [
      // Reliable Sepolia RPC endpoints
      "https://ethereum-sepolia.publicnode.com",
      "https://sepolia.drpc.org",
      "https://rpc2.sepolia.org",
      "https://ethereum-sepolia.rpc.subquery.network/public",
      "https://sepolia.gateway.tenderly.co",
      "https://gateway.tenderly.co/public/sepolia"
    ]
  };

  const rpcUrls: string[] = rpcByChain[DEFAULT_CHAIN_ID] ?? rpcByChain[11155111]!;
  
  if (!rpcByChain[DEFAULT_CHAIN_ID]) {
    console.warn(`⚠️ [BALANCE DEBUG] No RPC URLs configured for chainId ${DEFAULT_CHAIN_ID}, falling back to Sepolia endpoints`);
  }
  
  console.log(`🔍 [BALANCE DEBUG] Available RPC endpoints: ${rpcUrls.length}`);

  // Fetch both ETH and USDC balances concurrently
  const [ethBalance, usdcBalance] = await Promise.all([
    getEthBalance(address, rpcUrls),
    getTokenBalance(address, "USDC", rpcUrls)
  ]);

  const result: BalanceResponse = {
    eth: ethBalance,
    usdc: usdcBalance
  };

  console.log(`✅ [BALANCE DEBUG] Final balance result:`, result);
  return result;
};



// Function to fetch native ETH balance
const getEthBalance = async (address: string, rpcUrls: string[]): Promise<number> => {
  console.log(`💰 [ETH BALANCE DEBUG] Fetching ETH balance for address: ${address}`);

  // Try each RPC endpoint until one succeeds
  for (let i = 0; i < rpcUrls.length; i++) {
    const rpcUrl = rpcUrls[i]!;
    
    try {
      console.log(`🚀 [ETH BALANCE DEBUG] Attempting ETH balance fetch from RPC ${i + 1}/${rpcUrls.length}: ${rpcUrl}`);
      
      const requestPayload = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"],
      };
      
      console.log(`🔍 [ETH BALANCE DEBUG] Request payload:`, JSON.stringify(requestPayload, null, 2));
      
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "Roomy-Backend/1.0"
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      console.log(`🔍 [ETH BALANCE DEBUG] RPC response status: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const text = await res.text();
        console.warn(`⚠️ [ETH BALANCE DEBUG] RPC ${rpcUrl} failed with status ${res.status}: ${text}`);
        continue;
      }

      const json: any = await res.json();
      console.log(`🔍 [ETH BALANCE DEBUG] RPC response:`, JSON.stringify(json, null, 2));
      
      if (json.error) {
        console.warn(`⚠️ [ETH BALANCE DEBUG] RPC ${rpcUrl} returned JSON-RPC error:`, json.error);
        continue;
      }

      const result: string = json.result;
      if (!result) {
        console.warn(`⚠️ [ETH BALANCE DEBUG] RPC ${rpcUrl} returned empty result`);
        continue;
      }

      console.log(`🔍 [ETH BALANCE DEBUG] Raw ETH balance hex: ${result}`);
      
      const balance = decodeBalanceResult(result, 18); // ETH has 18 decimals
      console.log(`✅ [ETH BALANCE DEBUG] Successfully fetched ETH balance from ${rpcUrl}: ${balance} ETH`);
      
      return balance;
      
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.warn(`❌ [ETH BALANCE DEBUG] RPC ${rpcUrl} failed with error: ${errorMsg}`);
      
      if (i === rpcUrls.length - 1) {
        console.error(`❌ [ETH BALANCE DEBUG] All RPC endpoints failed for ETH balance fetch`);
      }
      continue;
    }
  }

  console.error(`❌ [ETH BALANCE DEBUG] getEthBalance failed for address ${address}`);
  return 0;
};

// Legacy function for backward compatibility - now returns only ETH
export const getAddressBalance = async (address: string): Promise<number> => {
  console.log(`🔍 [BALANCE DEBUG] Starting legacy ETH balance fetch for address: ${address}`);
  console.log(`🔍 [BALANCE DEBUG] Using chainId: ${DEFAULT_CHAIN_ID}`);
  
  // Validate address format first
  if (!address) {
    console.error(`❌ [BALANCE DEBUG] Address is empty or null`);
    return 0;
  }
  
  if (!isValidEthereumAddress(address)) {
    console.error(`❌ [BALANCE DEBUG] Invalid Ethereum address format: ${address}`);
    return 0;
  }
  
  console.log(`✅ [BALANCE DEBUG] Address format is valid`);
  
  // Define reliable RPC endpoints with fallbacks for each chain
  const rpcByChain: Record<number, string[]> = {
    80002: [
      "https://polygon-amoy-bor-rpc.publicnode.com",
      "https://rpc-amoy.polygon.technology",
      "https://polygon-amoy.drpc.org"
    ],
    421614: [
      "https://sepolia-rollup.arbitrum.io/rpc",
      "https://arbitrum-sepolia.drpc.org",
      "https://arbitrum-sepolia.publicnode.com"
    ],
    42161: [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum.drpc.org",
      "https://arbitrum.publicnode.com"
    ],
    11155111: [
      // Reliable Sepolia RPC endpoints
      "https://ethereum-sepolia.publicnode.com",
      "https://sepolia.drpc.org",
      "https://rpc2.sepolia.org",
      "https://ethereum-sepolia.rpc.subquery.network/public",
      "https://sepolia.gateway.tenderly.co",
      "https://gateway.tenderly.co/public/sepolia"
    ]
  };

  const rpcUrls: string[] = rpcByChain[DEFAULT_CHAIN_ID] ?? rpcByChain[11155111]!;
  
  if (!rpcByChain[DEFAULT_CHAIN_ID]) {
    console.warn(`⚠️ [BALANCE DEBUG] No RPC URLs configured for chainId ${DEFAULT_CHAIN_ID}, falling back to Sepolia endpoints`);
  }
  
  console.log(`🔍 [BALANCE DEBUG] Available RPC endpoints: ${rpcUrls.length}`);

  return await getEthBalance(address, rpcUrls);
};