'use client';

import { useState } from 'react';
import { openMarket, closeMarket, resolveOutcome } from '@/lib/api';
import { useMarket } from '@/providers/MarketProvider';
import type { Outcome } from '@/lib/types';

interface MarketControlsProps {
  className?: string;
}

export function MarketControls({ className = '' }: MarketControlsProps) {
  const { market, gameActive, refetch } = useMarket();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolveResult, setResolveResult] = useState<{
    winners: number;
    losers: number;
    payout: number;
  } | null>(null);

  const handleOpenMarket = async () => {
    setIsLoading(true);
    setError(null);
    setResolveResult(null);

    try {
      await openMarket({});
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open market');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseMarket = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await closeMarket();
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close market');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (outcome: Outcome) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await resolveOutcome({ outcome });
      setResolveResult({
        winners: result.winners.length,
        losers: result.losers.length,
        payout: result.totalPayout,
      });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve market');
    } finally {
      setIsLoading(false);
    }
  };

  const canOpenMarket = gameActive && (!market || market.status === 'RESOLVED');
  const canCloseMarket = market?.status === 'OPEN';
  const canResolve = market?.status === 'CLOSED';

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`} data-testid="market-controls">
      <h2 className="text-lg font-semibold text-white mb-4">Market Controls</h2>

      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400">Market Status</span>
        <span
          className={`px-3 py-1 rounded text-sm font-medium ${
            market?.status === 'OPEN'
              ? 'bg-green-500/20 text-green-400'
              : market?.status === 'CLOSED'
              ? 'bg-yellow-500/20 text-yellow-400'
              : market?.status === 'RESOLVED'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gray-600/50 text-gray-400'
          }`}
          data-testid="market-status"
        >
          {market?.status || 'NO MARKET'}
        </span>
      </div>

      {error && (
        <div
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400"
          data-testid="market-error"
        >
          {error}
        </div>
      )}

      {resolveResult && (
        <div
          className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 text-sm text-green-400"
          data-testid="resolve-result"
        >
          Resolved: {resolveResult.winners} winners, {resolveResult.losers} losers.
          Total payout: ${resolveResult.payout.toFixed(2)}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleOpenMarket}
          disabled={!canOpenMarket || isLoading}
          className="w-full py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          data-testid="open-market-button"
        >
          {isLoading ? 'Loading...' : 'Open Market'}
        </button>

        <button
          onClick={handleCloseMarket}
          disabled={!canCloseMarket || isLoading}
          className="w-full py-3 rounded-lg font-medium bg-yellow-600 hover:bg-yellow-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          data-testid="close-market-button"
        >
          Close Market
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleResolve('BALL')}
            disabled={!canResolve || isLoading}
            className="py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            data-testid="resolve-ball-button"
          >
            Resolve: Ball
          </button>
          <button
            onClick={() => handleResolve('STRIKE')}
            disabled={!canResolve || isLoading}
            className="py-3 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            data-testid="resolve-strike-button"
          >
            Resolve: Strike
          </button>
        </div>
      </div>
    </div>
  );
}
