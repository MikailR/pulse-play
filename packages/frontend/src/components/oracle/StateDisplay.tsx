'use client';

import { useSelectedMarket } from '@/providers/SelectedMarketProvider';

interface StateDisplayProps {
  className?: string;
  gameActive?: boolean;
  positionCount?: number;
  connectionCount?: number;
}

export function StateDisplay({
  className = '',
  gameActive = false,
  positionCount = 0,
  connectionCount = 0,
}: StateDisplayProps) {
  const { market, outcomes, isLoading, error } = useSelectedMarket();

  if (isLoading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`} data-testid="state-loading">
        <h2 className="text-lg font-semibold text-white mb-4">System State</h2>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-700 rounded w-1/2" />
          <div className="h-4 bg-gray-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`} data-testid="state-error">
        <h2 className="text-lg font-semibold text-white mb-4">System State</h2>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`} data-testid="state-display">
      <h2 className="text-lg font-semibold text-white mb-4">System State</h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Game Active</span>
          <span
            className={gameActive ? 'text-green-400' : 'text-gray-500'}
            data-testid="state-game-active"
          >
            {gameActive ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Market ID</span>
          <span className="text-white font-mono" data-testid="state-market-id">
            {market?.id || '-'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Market Status</span>
          <span className="text-white" data-testid="state-market-status">
            {market?.status || 'None'}
          </span>
        </div>

        {outcomes.length > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Outcomes</span>
            <span className="text-white" data-testid="state-outcomes">
              {outcomes.join(', ')}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-400">Positions</span>
          <span className="text-white" data-testid="state-position-count">
            {positionCount}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Connections</span>
          <span className="text-white" data-testid="state-connection-count">
            {connectionCount}
          </span>
        </div>
      </div>
    </div>
  );
}
