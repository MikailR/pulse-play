'use client';

import { useState, useEffect } from 'react';
import { getAdminState } from '@/lib/api';
import type { AdminStateResponse } from '@/lib/types';

interface StateDisplayProps {
  className?: string;
  refreshInterval?: number;
}

export function StateDisplay({
  className = '',
  refreshInterval = 5000,
}: StateDisplayProps) {
  const [state, setState] = useState<AdminStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = async () => {
    try {
      const data = await getAdminState();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch state');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

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
            className={state?.gameState.active ? 'text-green-400' : 'text-gray-500'}
            data-testid="state-game-active"
          >
            {state?.gameState.active ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Market ID</span>
          <span className="text-white font-mono" data-testid="state-market-id">
            {state?.market?.id || '-'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Market Status</span>
          <span className="text-white" data-testid="state-market-status">
            {state?.market?.status || 'None'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Positions</span>
          <span className="text-white" data-testid="state-position-count">
            {state?.positionCount ?? 0}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Connections</span>
          <span className="text-white" data-testid="state-connection-count">
            {state?.connectionCount ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}
