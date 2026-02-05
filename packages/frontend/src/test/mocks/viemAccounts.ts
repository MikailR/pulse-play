// Mock viem/accounts
export function privateKeyToAccount(privateKey: `0x${string}`) {
  // Generate a deterministic address from the private key
  // In tests, just use a fake address based on the key
  const address = `0x${privateKey.slice(2, 42).padStart(40, '0')}` as `0x${string}`;
  return {
    address,
    publicKey: `0x${'0'.repeat(128)}` as `0x${string}`,
    signMessage: jest.fn().mockResolvedValue('0x' + '0'.repeat(130)),
    signTransaction: jest.fn().mockResolvedValue('0x' + '0'.repeat(130)),
    signTypedData: jest.fn().mockResolvedValue('0x' + '0'.repeat(130)),
  };
}

export function generatePrivateKey() {
  return `0x${'a'.repeat(64)}` as `0x${string}`;
}
