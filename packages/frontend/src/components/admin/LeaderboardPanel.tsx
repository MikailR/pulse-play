'use client';

import { useEffect, useState, useCallback } from 'react';
import { getLeaderboard } from '@/lib/api';
import type { UserStats } from '@/lib/types';

export function LeaderboardPanel() {
  const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getLeaderboard(50);
      setLeaderboard(data.leaderboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2" data-testid="leaderboard-loading">
        <div className="h-12 bg-surface-input rounded" />
        <div className="h-12 bg-surface-input rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="leaderboard-error" className="text-center py-8">
        <p className="text-red-400 text-sm mb-3">{error}</p>
        <button
          onClick={fetchLeaderboard}
          className="px-4 py-2 bg-surface-raised text-text-primary rounded text-sm hover:bg-surface-overlay transition-colors"
          data-testid="leaderboard-retry"
        >
          Retry
        </button>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <p className="text-text-muted text-sm text-center py-8" data-testid="leaderboard-empty">
        No data yet.
      </p>
    );
  }

  return (
    <div data-testid="leaderboard-panel">
      <div className="flex justify-end mb-3">
        <button
          onClick={fetchLeaderboard}
          className="px-3 py-1 bg-surface-raised text-text-secondary rounded text-xs hover:bg-surface-overlay transition-colors"
          data-testid="leaderboard-refresh"
        >
          Refresh
        </button>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-6 gap-2 px-4 py-2 text-xs text-text-muted font-medium border-b border-border">
        <span>#</span>
        <span>Address</span>
        <span className="text-right">Bets</span>
        <span className="text-right">W/L</span>
        <span className="text-right">Wagered</span>
        <span className="text-right">Net P&L</span>
      </div>

      <div className="space-y-0">
        {leaderboard.map((user, i) => {
          const rank = i + 1;
          const rankStyle =
            rank === 1
              ? 'text-yellow-400'
              : rank === 2
              ? 'text-gray-300'
              : rank === 3
              ? 'text-amber-600'
              : 'text-text-muted';

          return (
            <div
              key={user.address}
              className="grid grid-cols-6 gap-2 px-4 py-3 text-sm hover:bg-surface-raised/50 transition-colors"
              data-testid={`leaderboard-row-${i}`}
            >
              <span className={`font-bold ${rankStyle}`}>{rank}</span>
              <span className="text-text-primary font-mono text-xs">{truncate(user.address)}</span>
              <span className="text-text-secondary text-right">{user.totalBets}</span>
              <span className="text-right">
                <span className="text-green-400">{user.totalWins}</span>
                <span className="text-text-muted">/</span>
                <span className="text-red-400">{user.totalLosses}</span>
              </span>
              <span className="text-text-secondary text-right">${user.totalWagered.toFixed(2)}</span>
              <span
                className={`text-right font-medium ${
                  user.netPnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {user.netPnl >= 0 ? '+' : ''}${user.netPnl.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
