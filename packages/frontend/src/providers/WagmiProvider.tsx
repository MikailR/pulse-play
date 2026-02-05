'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { WagmiProvider as WagmiProviderBase, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { privateKeyToAccount } from 'viem/accounts';
import { PRIVATE_KEY } from '@/lib/config';

// Create account from private key if provided
const account = PRIVATE_KEY ? privateKeyToAccount(PRIVATE_KEY) : undefined;

// Configure wagmi without connectors (we use direct viem for signing)
export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

// Query client for react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: false,
    },
  },
});

// Context for wallet address (derived from private key)
interface WalletContextValue {
  address: `0x${string}` | undefined;
  isConfigured: boolean;
}

const WalletContext = createContext<WalletContextValue>({
  address: undefined,
  isConfigured: false,
});

export function useWallet() {
  return useContext(WalletContext);
}

interface WagmiProviderProps {
  children: ReactNode;
}

export function WagmiProvider({ children }: WagmiProviderProps) {
  const walletValue: WalletContextValue = {
    address: account?.address,
    isConfigured: !!account,
  };

  return (
    <WalletContext.Provider value={walletValue}>
      <WagmiProviderBase config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProviderBase>
    </WalletContext.Provider>
  );
}
