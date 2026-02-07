'use client';

import { useEffect, useState, useCallback } from 'react';
import { getUserStats, ApiError } from '@/lib/api';
import { useWallet } from '@/providers/WagmiProvider';
import type { UserStats } from '@/lib/types';

interface UserStatsCardProps {
  refreshKey?: number;
}

export function UserStatsCard({ refreshKey }: UserStatsCardProps) {
  const { address } = useWallet();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserStats(address);
      setStats(data.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStats(null); // User legitimately has no activity
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      }
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  if (!address) {
    return (
      <div className="bg-surface-raised border border-border rounded-lg p-6" data-testid="stats-not-connected">
        <p className="text-text-muted text-sm text-center">Connect wallet to view stats</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-surface-raised border border-border rounded-lg p-6 animate-pulse" data-testid="stats-loading">
        <div className="h-8 bg-surface-input rounded w-1/3 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-surface-input rounded" />
          <div className="h-16 bg-surface-input rounded" />
          <div className="h-16 bg-surface-input rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-raised border border-border rounded-lg p-6" data-testid="stats-error">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Your Stats</h2>
          <button
            onClick={fetchStats}
            className="px-3 py-1 bg-surface-overlay text-text-secondary rounded text-xs hover:bg-surface-input transition-colors"
            data-testid="stats-retry"
          >
            Retry
          </button>
        </div>
        <p className="text-red-400 text-sm text-center py-4" data-testid="stats-error-message">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-surface-raised border border-border rounded-lg p-6" data-testid="stats-empty">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Your Stats</h2>
          <button
            onClick={fetchStats}
            className="px-3 py-1 bg-surface-overlay text-text-secondary rounded text-xs hover:bg-surface-input transition-colors"
            data-testid="stats-refresh"
          >
            Refresh
          </button>
        </div>
        <p className="text-text-muted text-sm text-center py-4">No activity yet. Place your first bet!</p>
      </div>
    );
  }

  const winRate = stats.totalBets > 0 ? ((stats.totalWins / stats.totalBets) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-surface-raised border border-border rounded-lg p-6" data-testid="stats-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Your Stats</h2>
        <button
          onClick={fetchStats}
          className="px-3 py-1 bg-surface-overlay text-text-secondary rounded text-xs hover:bg-surface-input transition-colors"
          data-testid="stats-refresh"
        >
          Refresh
        </button>
      </div>

      {/* Headline: Net P&L */}
      <div className="text-center mb-6">
        <p className="text-text-muted text-sm mb-1">Net P&L</p>
        <p
          className={`text-3xl font-bold ${stats.netPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
          data-testid="stats-pnl"
        >
          {stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toFixed(2)}
        </p>
        <p className="text-text-muted text-sm mt-1" data-testid="stats-winrate">
          {winRate}% win rate
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center">
          <p className="text-text-muted text-xs">Total Bets</p>
          <p className="text-text-primary text-lg font-semibold" data-testid="stats-total-bets">{stats.totalBets}</p>
        </div>
        <div className="text-center">
          <p className="text-text-muted text-xs">Wins</p>
          <p className="text-green-400 text-lg font-semibold" data-testid="stats-wins">{stats.totalWins}</p>
        </div>
        <div className="text-center">
          <p className="text-text-muted text-xs">Losses</p>
          <p className="text-red-400 text-lg font-semibold" data-testid="stats-losses">{stats.totalLosses}</p>
        </div>
        <div className="text-center">
          <p className="text-text-muted text-xs">Wagered</p>
          <p className="text-text-primary text-lg font-semibold" data-testid="stats-wagered">${stats.totalWagered.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-text-muted text-xs">Payout</p>
          <p className="text-text-primary text-lg font-semibold" data-testid="stats-payout">${stats.totalPayout.toFixed(2)}</p>
        </div>
      </div>

      {/* Timestamps */}
      {stats.firstSeenAt > 0 && (
        <div className="flex justify-between mt-4 pt-4 border-t border-border text-xs text-text-muted">
          <span>Member since: {new Date(stats.firstSeenAt).toLocaleDateString()}</span>
          <span>Last active: {new Date(stats.lastActiveAt).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
