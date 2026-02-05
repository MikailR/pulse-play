'use client';

import { useState } from 'react';
import { setGameState } from '@/lib/api';
import { useMarket } from '@/providers/MarketProvider';

interface GameControlsProps {
  className?: string;
}

export function GameControls({ className = '' }: GameControlsProps) {
  const { gameActive, refetch } = useMarket();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await setGameState({ active: !gameActive });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update game state');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`} data-testid="game-controls">
      <h2 className="text-lg font-semibold text-white mb-4">Game State</h2>

      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400">Current Status</span>
        <span
          className={`px-3 py-1 rounded text-sm font-medium ${
            gameActive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-600/50 text-gray-400'
          }`}
          data-testid="game-status"
        >
          {gameActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      {error && (
        <div
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400"
          data-testid="game-error"
        >
          {error}
        </div>
      )}

      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`w-full py-3 rounded-lg font-medium transition-colors ${
          gameActive
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        data-testid="game-toggle-button"
      >
        {isLoading
          ? 'Updating...'
          : gameActive
          ? 'Deactivate Game'
          : 'Activate Game'}
      </button>
    </div>
  );
}
