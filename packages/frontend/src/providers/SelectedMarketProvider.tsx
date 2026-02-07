'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { getMarketById } from '@/lib/api';
import { useWebSocket } from './WebSocketProvider';
import type { MarketData, WsMessage } from '@/lib/types';

interface SelectedMarketContextValue {
  market: MarketData | null;
  prices: number[];
  outcomes: string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SelectedMarketContext = createContext<SelectedMarketContextValue>({
  market: null,
  prices: [0.5, 0.5],
  outcomes: [],
  isLoading: true,
  error: null,
  refetch: async () => {},
});

export function useSelectedMarket() {
  return useContext(SelectedMarketContext);
}

interface SelectedMarketProviderProps {
  marketId?: string | null;
  children: ReactNode;
}

export function SelectedMarketProvider({
  marketId,
  children,
}: SelectedMarketProviderProps) {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [prices, setPrices] = useState<number[]>([0.5, 0.5]);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useWebSocket();

  const refetch = useCallback(async () => {
    if (!marketId) {
      setMarket(null);
      setPrices([0.5, 0.5]);
      setOutcomes([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getMarketById(marketId);
      setMarket(data.market);
      setPrices(data.prices);
      setOutcomes(data.outcomes);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to fetch market');
    }
  }, [marketId]);

  // Fetch when marketId changes
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Subscribe to WebSocket updates filtered by marketId
  useEffect(() => {
    if (!marketId) return;

    const handleMessage = (message: WsMessage) => {
      switch (message.type) {
        case 'ODDS_UPDATE':
          if (message.marketId === marketId) {
            setPrices(message.prices);
            setMarket((prev) =>
              prev ? { ...prev, quantities: message.quantities } : prev
            );
          }
          break;

        case 'MARKET_STATUS':
          if (message.marketId === marketId) {
            setMarket((prev) =>
              prev
                ? {
                    ...prev,
                    status: message.status,
                    outcome: message.outcome ?? prev.outcome,
                  }
                : prev
            );
            if (message.status === 'OPEN' || message.status === 'RESOLVED') {
              refetch();
            }
          }
          break;
      }
    };

    return subscribe(handleMessage);
  }, [subscribe, marketId, refetch]);

  const value: SelectedMarketContextValue = {
    market,
    prices,
    outcomes,
    isLoading,
    error,
    refetch,
  };

  return (
    <SelectedMarketContext.Provider value={value}>
      {children}
    </SelectedMarketContext.Provider>
  );
}
