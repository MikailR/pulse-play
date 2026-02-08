'use client';

import { useState, useCallback } from 'react';
import {
  MMFaucetCard,
  MMBalanceCard,
  MMFeeCard,
  PoolStatsCard,
  LPPositionCard,
  LPDepositForm,
  LPWithdrawForm,
  LPEventHistory,
} from '@/components/market-maker';

export default function MarketMakerPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  // TODO: Get actual wallet address from ClearnodeProvider
  const walletAddress: string | null = null;

  const handleFunded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleLPAction = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono uppercase tracking-wide text-text-primary">Market Maker</h1>
        <p className="text-text-secondary mt-2">
          View market maker status and manage funds
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MMFaucetCard onFunded={handleFunded} />
        </div>
        <div className="space-y-6">
          <MMBalanceCard refreshKey={refreshKey} />
          <MMFeeCard />
        </div>
      </div>

      {/* LP Pool Section */}
      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-bold font-mono uppercase tracking-wide text-text-primary mb-4">
          Liquidity Pool
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PoolStatsCard refreshKey={refreshKey} />
          <LPPositionCard address={walletAddress} refreshKey={refreshKey} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <LPDepositForm address={walletAddress} onDeposit={handleLPAction} />
          <LPWithdrawForm address={walletAddress} onWithdraw={handleLPAction} />
        </div>

        <div className="mt-6">
          <LPEventHistory address={walletAddress} refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
