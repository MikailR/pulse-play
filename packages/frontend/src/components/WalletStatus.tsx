'use client';

import { useWallet } from '@/providers/WagmiProvider';

interface WalletStatusProps {
  className?: string;
}

export function WalletStatus({ className = '' }: WalletStatusProps) {
  const { address, isConfigured } = useWallet();

  if (!isConfigured) {
    return (
      <div className={`text-sm text-yellow-500 ${className}`} data-testid="wallet-not-configured">
        Wallet not configured
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="wallet-status">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-sm font-mono text-gray-300" data-testid="wallet-address">
        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'}
      </span>
    </div>
  );
}
