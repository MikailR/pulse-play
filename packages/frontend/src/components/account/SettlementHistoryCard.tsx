'use client';

import { useEffect, useState, useCallback } from 'react';
import { getUserHistory } from '@/lib/api';
import { useWallet } from '@/providers/WagmiProvider';
import type { Settlement } from '@/lib/types';

export function SettlementHistoryCard() {
  const { address } = useWallet();
  const [history, setHistory] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getUserHistory(address);
      setHistory(data.history);
    } catch {
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (!address) return null;

  return (
    <div className="bg-surface-raised border border-border rounded-lg p-6" data-testid="settlement-history-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Settlement History</h2>
        <button
          onClick={fetchHistory}
          className="px-3 py-1 bg-surface-overlay text-text-secondary rounded text-xs hover:bg-surface-input transition-colors"
          data-testid="history-refresh"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2" data-testid="history-loading">
          <div className="h-8 bg-surface-input rounded" />
          <div className="h-8 bg-surface-input rounded" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-4" data-testid="history-empty">
          No settlement history yet.
        </p>
      ) : (
        <div data-testid="history-list">
          {/* Table header */}
          <div className="grid grid-cols-7 gap-2 px-3 py-2 text-xs text-text-muted font-medium border-b border-border">
            <span>Date</span>
            <span>Market</span>
            <span>Outcome</span>
            <span className="text-center">Result</span>
            <span className="text-right">Wagered</span>
            <span className="text-right">Payout</span>
            <span className="text-right">Profit</span>
          </div>

          {history.map((s) => (
            <div
              key={s.id}
              className={`grid grid-cols-7 gap-2 px-3 py-2 text-sm ${
                s.result === 'WIN' ? 'bg-green-500/5' : 'bg-red-500/5'
              }`}
              data-testid={`history-row-${s.id}`}
            >
              <span className="text-text-muted text-xs">
                {new Date(s.settledAt).toLocaleDateString()}
              </span>
              <span className="text-text-secondary font-mono text-xs truncate">{s.marketId}</span>
              <span className="text-text-primary text-xs">{s.outcome}</span>
              <span className="text-center">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    s.result === 'WIN'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                  data-testid={`result-badge-${s.id}`}
                >
                  {s.result}
                </span>
              </span>
              <span className="text-text-secondary text-right text-xs">${s.costPaid.toFixed(2)}</span>
              <span className="text-text-secondary text-right text-xs">${s.payout.toFixed(2)}</span>
              <span
                className={`text-right text-xs font-medium ${
                  s.profit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {s.profit >= 0 ? '+' : ''}${s.profit.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
