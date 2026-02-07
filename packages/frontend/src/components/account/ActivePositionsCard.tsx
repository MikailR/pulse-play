'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPositions } from '@/lib/api';
import { useWallet } from '@/providers/WagmiProvider';
import type { Position } from '@/lib/types';

export function ActivePositionsCard() {
  const { address } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getPositions(address);
      setPositions(data.positions);
    } catch {
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  if (!address) return null;

  return (
    <div className="bg-surface-raised border border-border rounded-lg p-6" data-testid="active-positions-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Active Positions</h2>
        <button
          onClick={fetchPositions}
          className="px-3 py-1 bg-surface-overlay text-text-secondary rounded text-xs hover:bg-surface-input transition-colors"
          data-testid="positions-refresh"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2" data-testid="positions-loading">
          <div className="h-8 bg-surface-input rounded" />
          <div className="h-8 bg-surface-input rounded" />
        </div>
      ) : positions.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-4" data-testid="positions-empty">
          No active positions.
        </p>
      ) : (
        <div data-testid="positions-list">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-2 px-3 py-2 text-xs text-text-muted font-medium border-b border-border">
            <span>Market</span>
            <span>Outcome</span>
            <span className="text-right">Shares</span>
            <span className="text-right">Cost Paid</span>
            <span className="text-center">Status</span>
          </div>

          {positions.map((p, i) => (
            <div
              key={`${p.marketId}-${p.outcome}-${i}`}
              className="grid grid-cols-5 gap-2 px-3 py-2 text-sm hover:bg-surface-overlay/50 transition-colors"
              data-testid={`position-row-${i}`}
            >
              <span className="text-text-secondary font-mono text-xs truncate">{p.marketId}</span>
              <span className="text-text-primary text-xs">{p.outcome}</span>
              <span className="text-text-secondary text-right text-xs">{p.shares.toFixed(2)}</span>
              <span className="text-text-secondary text-right text-xs">${p.costPaid.toFixed(2)}</span>
              <span className="text-center">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    p.sessionStatus === 'open'
                      ? 'bg-green-500/20 text-green-400'
                      : p.sessionStatus === 'settled'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {p.sessionStatus ?? 'open'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
