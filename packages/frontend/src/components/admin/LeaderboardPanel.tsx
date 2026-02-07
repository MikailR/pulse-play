'use client';

import { useEffect, useState } from 'react';
import { getLeaderboard } from '@/lib/api';
import type { UserStats } from '@/lib/types';

export function LeaderboardPanel() {
  const [leaderboard, setLeaderboard] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLeaderboard(50)
      .then((data) => {
        setLeaderboard(data.leaderboard);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2" data-testid="leaderboard-loading">
        <div className="h-12 bg-gray-700 rounded" />
        <div className="h-12 bg-gray-700 rounded" />
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-8" data-testid="leaderboard-empty">
        No data yet.
      </p>
    );
  }

  return (
    <div data-testid="leaderboard-panel">
      {/* Table header */}
      <div className="grid grid-cols-6 gap-2 px-4 py-2 text-xs text-gray-500 font-medium border-b border-gray-700">
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
              : 'text-gray-500';

          return (
            <div
              key={user.address}
              className="grid grid-cols-6 gap-2 px-4 py-3 text-sm hover:bg-gray-800/50 transition-colors"
              data-testid={`leaderboard-row-${i}`}
            >
              <span className={`font-bold ${rankStyle}`}>{rank}</span>
              <span className="text-white font-mono text-xs">{truncate(user.address)}</span>
              <span className="text-gray-400 text-right">{user.totalBets}</span>
              <span className="text-right">
                <span className="text-green-400">{user.totalWins}</span>
                <span className="text-gray-600">/</span>
                <span className="text-red-400">{user.totalLosses}</span>
              </span>
              <span className="text-gray-400 text-right">${user.totalWagered.toFixed(2)}</span>
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
