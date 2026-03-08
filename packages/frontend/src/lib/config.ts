// Environment configuration
export const HUB_REST_URL =
  process.env.NEXT_PUBLIC_HUB_REST_URL || 'http://localhost:3001';

export const HUB_WS_URL =
  process.env.NEXT_PUBLIC_HUB_WS_URL || 'ws://localhost:3001/ws';

export const PRIVATE_KEY = process.env.NEXT_PUBLIC_PRIVATE_KEY as
  | `0x${string}`
  | undefined;

// Wallet mode configuration
export type WalletMode = 'metamask' | 'private-key';
export const WALLET_MODE: WalletMode =
  (process.env.NEXT_PUBLIC_WALLET_MODE as WalletMode) || 'private-key';

// Network mode configuration
export type NetworkMode = 'mainnet' | 'sandbox';
export const NETWORK_MODE: NetworkMode =
  (process.env.NEXT_PUBLIC_NETWORK_MODE as NetworkMode) || 'mainnet';

export const IS_SANDBOX = NETWORK_MODE === 'sandbox';

// Clearnode WebSocket URL
export const CLEARNODE_URL =
  process.env.NEXT_PUBLIC_CLEARNODE_URL ||
  (NETWORK_MODE === 'mainnet'
    ? 'wss://clearnet.yellow.com/ws'
    : 'wss://clearnet-sandbox.yellow.com/ws');

// Market Maker address (counterparty for app sessions)
export const MM_ADDRESS = process.env.NEXT_PUBLIC_MM_ADDRESS as
  | `0x${string}`
  | undefined;

// Chain configuration — Base (8453) for mainnet, Sepolia (11155111) for sandbox
export const CHAIN_ID = NETWORK_MODE === 'mainnet' ? 8453 : 11155111;

// Asset name on Clearnode
export const ASSET = NETWORK_MODE === 'mainnet' ? 'usdc' : 'ytest.usd';

// Challenge period (seconds) for app sessions
export const CHALLENGE_PERIOD = NETWORK_MODE === 'mainnet' ? 86400 : 3600;
