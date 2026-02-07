'use client';

import { useEffect, useState } from 'react';
import { getLeaderboard, getUserHistory } from '@/lib/api';
import type { UserStats, Settlement } from '@/lib/types';

export function UsersPanel() {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, Settlement[]>>({});

  useEffect(() => {
    getLeaderboard(100)
      .then((data) => {
        setUsers(data.leaderboard);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleExpand = async (address: string) => {
    if (expandedUser === address) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(address);
    if (!history[address]) {
      try {
        const data = await getUserHistory(address);
        setHistory((prev) => ({ ...prev, [address]: data.history }));
      } catch {
        setHistory((prev) => ({ ...prev, [address]: [] }));
      }
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2" data-testid="users-loading">
        <div className="h-12 bg-gray-700 rounded" />
        <div className="h-12 bg-gray-700 rounded" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-8" data-testid="users-empty">
        No users yet.
      </p>
    );
  }

  return (
    <div data-testid="users-panel">
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.address} className="bg-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => handleExpand(user.address)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-750 transition-colors"
              data-testid={`user-row-${user.address}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-white font-mono text-sm">{truncate(user.address)}</span>
                <span className="text-gray-500 text-xs">{user.totalBets} bets</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400 text-sm">{user.totalWins}W</span>
                <span className="text-red-400 text-sm">{user.totalLosses}L</span>
                <span
                  className={`text-sm font-medium ${
                    user.netPnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {user.netPnl >= 0 ? '+' : ''}${user.netPnl.toFixed(2)}
                </span>
              </div>
            </button>

            {expandedUser === user.address && (
              <div
                className="px-4 pb-3 border-t border-gray-700"
                data-testid={`user-history-${user.address}`}
              >
                {(history[user.address] ?? []).length === 0 ? (
                  <p className="text-gray-500 text-sm py-2">No settlement history.</p>
                ) : (
                  <div className="space-y-1 mt-2">
                    {(history[user.address] ?? []).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs py-1"
                        data-testid={`settlement-${s.id}`}
                      >
                        <span className="text-gray-400 font-mono">{s.marketId}</span>
                        <span className="text-gray-300">{s.outcome}</span>
                        <span
                          className={
                            s.result === 'WIN' ? 'text-green-400' : 'text-red-400'
                          }
                        >
                          {s.result}
                        </span>
                        <span className="text-gray-400">
                          ${s.profit >= 0 ? '+' : ''}
                          {s.profit.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
