'use client';

import { usePositions } from '@/hooks/usePositions';
import { useWallet } from '@/providers/WagmiProvider';
import { useMarket } from '@/providers/MarketProvider';
import type { Position } from '@/lib/types';

interface PositionListProps {
  className?: string;
}

function PositionCard({ position }: { position: Position }) {
  return (
    <div
      className={`bg-gray-700/50 rounded-lg p-4 border ${
        position.outcome === 'Ball'
          ? 'border-blue-500/30'
          : 'border-red-500/30'
      }`}
      data-testid={`position-${position.marketId}`}
    >
      <div className="flex justify-between items-center mb-2">
        <span
          className={`text-sm font-medium ${
            position.outcome === 'Ball' ? 'text-blue-400' : 'text-red-400'
          }`}
          data-testid="position-outcome"
        >
          {position.outcome}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(position.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Shares</span>
          <div className="text-white font-mono" data-testid="position-shares">
            {position.shares.toFixed(2)}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Cost</span>
          <div className="text-white font-mono" data-testid="position-cost">
            ${position.costPaid.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PositionList({ className = '' }: PositionListProps) {
  const { address } = useWallet();
  const { market } = useMarket();
  const { positions, isLoading, error } = usePositions({
    address,
    marketId: market?.id,
  });

  if (!address) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`} data-testid="position-list">
        <h2 className="text-lg font-semibold text-white mb-4">Your Positions</h2>
        <p className="text-gray-400 text-sm" data-testid="no-wallet">
          Connect wallet to view positions
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`} data-testid="positions-loading">
        <h2 className="text-lg font-semibold text-white mb-4">Your Positions</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-gray-700 rounded" />
          <div className="h-20 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`} data-testid="positions-error">
        <h2 className="text-lg font-semibold text-white mb-4">Your Positions</h2>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`} data-testid="position-list">
      <h2 className="text-lg font-semibold text-white mb-4">
        Your Positions
        {positions.length > 0 && (
          <span className="text-sm text-gray-500 ml-2">({positions.length})</span>
        )}
      </h2>
      {positions.length === 0 ? (
        <p className="text-gray-400 text-sm" data-testid="no-positions">
          No positions in current market
        </p>
      ) : (
        <div className="space-y-3" data-testid="positions-container">
          {positions.map((position, index) => (
            <PositionCard key={`${position.marketId}-${index}`} position={position} />
          ))}
        </div>
      )}
    </div>
  );
}
