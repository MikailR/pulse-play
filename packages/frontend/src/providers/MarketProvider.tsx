'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { getMarket } from '@/lib/api';
import { useWebSocket } from './WebSocketProvider';
import type { MarketData, MarketStatus, WsMessage } from '@/lib/types';

interface MarketState {
  market: MarketData | null;
  priceBall: number;
  priceStrike: number;
  gameActive: boolean;
  isLoading: boolean;
  error: string | null;
}

interface MarketContextValue extends MarketState {
  refetch: () => Promise<void>;
}

const initialState: MarketState = {
  market: null,
  priceBall: 0.5,
  priceStrike: 0.5,
  gameActive: false,
  isLoading: true,
  error: null,
};

const MarketContext = createContext<MarketContextValue>({
  ...initialState,
  refetch: async () => {},
});

export function useMarket() {
  return useContext(MarketContext);
}

interface MarketProviderProps {
  children: ReactNode;
}

export function MarketProvider({ children }: MarketProviderProps) {
  const [state, setState] = useState<MarketState>(initialState);
  const { subscribe } = useWebSocket();

  // Fetch market data from REST API
  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await getMarket();
      setState((prev) => ({
        ...prev,
        market: data.market,
        priceBall: data.priceBall,
        priceStrike: data.priceStrike,
        isLoading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch market',
      }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const handleMessage = (message: WsMessage) => {
      switch (message.type) {
        case 'ODDS_UPDATE':
          setState((prev) => ({
            ...prev,
            priceBall: message.priceBall,
            priceStrike: message.priceStrike,
          }));
          break;

        case 'MARKET_STATUS':
          setState((prev) => ({
            ...prev,
            market: prev.market
              ? {
                  ...prev.market,
                  status: message.status as MarketStatus,
                  outcome: message.outcome ?? prev.market.outcome,
                }
              : null,
          }));
          // Refetch for full market data when status changes
          if (message.status === 'OPEN' || message.status === 'RESOLVED') {
            refetch();
          }
          break;

        case 'GAME_STATE':
          setState((prev) => ({
            ...prev,
            gameActive: message.active,
          }));
          break;
      }
    };

    return subscribe(handleMessage);
  }, [subscribe, refetch]);

  const value: MarketContextValue = {
    ...state,
    refetch,
  };

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  );
}
