// Mock viem module
export function createPublicClient() {
  return {
    chain: { id: 11155111 },
    transport: {},
  };
}

export function createWalletClient() {
  return {
    chain: { id: 11155111 },
    transport: {},
    account: undefined,
  };
}

export function http() {
  return { type: 'http' };
}

export function custom() {
  return { type: 'custom' };
}

export const formatEther = (wei: bigint) => String(Number(wei) / 1e18);
export const parseEther = (ether: string) => BigInt(Math.floor(Number(ether) * 1e18));
