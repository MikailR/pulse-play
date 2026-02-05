'use client';

import { useState, useCallback } from 'react';
import { placeBet } from '@/lib/api';
import type { BetRequest, BetResponse, Outcome } from '@/lib/types';

interface UseBetOptions {
  address?: string;
  marketId?: string;
  appSessionId?: string;
  onSuccess?: (response: BetResponse) => void;
  onError?: (error: Error) => void;
}

interface UseBetReturn {
  bet: (outcome: Outcome, amount: number) => Promise<BetResponse | null>;
  isLoading: boolean;
  error: string | null;
  lastResponse: BetResponse | null;
}

export function useBet(options: UseBetOptions = {}): UseBetReturn {
  const { address, marketId, appSessionId, onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<BetResponse | null>(null);

  const bet = useCallback(
    async (outcome: Outcome, amount: number): Promise<BetResponse | null> => {
      if (!address || !marketId || !appSessionId) {
        const err = new Error('Missing required bet parameters');
        setError(err.message);
        onError?.(err);
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: BetRequest = {
          address,
          marketId,
          outcome,
          amount,
          appSessionId,
        };

        const response = await placeBet(request);
        setLastResponse(response);

        if (!response.accepted) {
          const err = new Error(response.reason || 'Bet rejected');
          setError(err.message);
          onError?.(err);
        } else {
          onSuccess?.(response);
        }

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error.message);
        onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [address, marketId, appSessionId, onSuccess, onError]
  );

  return {
    bet,
    isLoading,
    error,
    lastResponse,
  };
}
