'use client';

import { useState, useCallback, useEffect } from 'react';
import { getPositions } from '@/lib/api';
import { useWebSocket } from '@/providers/WebSocketProvider';
import type { Position } from '@/lib/types';

interface UsePositionsOptions {
  address?: string;
  marketId?: string;
}

interface UsePositionsReturn {
  positions: Position[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePositions(options: UsePositionsOptions = {}): UsePositionsReturn {
  const { address, marketId } = options;
  const { subscribe } = useWebSocket();

  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!address) {
      setPositions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getPositions(address);
      let filteredPositions = response.positions;

      // Filter by marketId if specified
      if (marketId) {
        filteredPositions = filteredPositions.filter(
          (p) => p.marketId === marketId
        );
      }

      setPositions(filteredPositions);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [address, marketId]);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Refetch on market resolution
  useEffect(() => {
    return subscribe((message) => {
      if (
        message.type === 'MARKET_STATUS' &&
        message.status === 'RESOLVED' &&
        (!marketId || message.marketId === marketId)
      ) {
        refetch();
      }
    });
  }, [subscribe, marketId, refetch]);

  return {
    positions,
    isLoading,
    error,
    refetch,
  };
}
