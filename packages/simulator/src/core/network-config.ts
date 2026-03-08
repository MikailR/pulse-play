/**
 * Centralized network configuration for Yellow Network environments.
 * Controlled by the NETWORK_MODE env var ('mainnet' | 'sandbox').
 */

export type NetworkMode = 'mainnet' | 'sandbox';

export const NETWORK_MODE: NetworkMode =
  (process.env.NETWORK_MODE as NetworkMode) || 'mainnet';

export const NETWORK_CONFIG = {
  mainnet: {
    clearnodeUrl: 'wss://clearnet.yellow.com/ws',
    asset: 'usdc',
    chainId: 8453,
    challengePeriod: 86400,
  },
  sandbox: {
    clearnodeUrl: 'wss://clearnet-sandbox.yellow.com/ws',
    asset: 'ytest.usd',
    chainId: 11155111,
    challengePeriod: 3600,
  },
} as const;

export function getNetworkConfig() {
  return NETWORK_CONFIG[NETWORK_MODE];
}
