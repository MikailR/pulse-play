// Environment configuration
export const HUB_REST_URL =
  process.env.NEXT_PUBLIC_HUB_REST_URL || 'http://localhost:3001';

export const HUB_WS_URL =
  process.env.NEXT_PUBLIC_HUB_WS_URL || 'ws://localhost:3001/ws';

export const PRIVATE_KEY = process.env.NEXT_PUBLIC_PRIVATE_KEY as
  | `0x${string}`
  | undefined;

// Chain configuration
export const CHAIN_ID = 11155111; // Sepolia
