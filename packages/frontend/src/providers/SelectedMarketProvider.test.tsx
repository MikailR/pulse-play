import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SelectedMarketProvider, useSelectedMarket } from './SelectedMarketProvider';
import { WebSocketProvider } from './WebSocketProvider';
import * as api from '@/lib/api';
import {
  MockWebSocket,
  installMockWebSocket,
  flushPromises,
} from '@/test/mocks/websocket';

jest.mock('@/lib/api');
const mockGetMarketById = api.getMarketById as jest.MockedFunction<typeof api.getMarketById>;

function MarketConsumer() {
  const { market, prices, outcomes, isLoading, error } = useSelectedMarket();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'yes' : 'no'}</span>
      <span data-testid="error">{error || 'none'}</span>
      <span data-testid="market-id">{market?.id || 'no-market'}</span>
      <span data-testid="market-status">{market?.status || 'none'}</span>
      <span data-testid="prices">{JSON.stringify(prices)}</span>
      <span data-testid="outcomes">{JSON.stringify(outcomes)}</span>
      <span data-testid="quantities">{market ? JSON.stringify(market.quantities) : '[]'}</span>
    </div>
  );
}

function TestWrapper({
  children,
  marketId,
}: {
  children: React.ReactNode;
  marketId?: string | null;
}) {
  return (
    <WebSocketProvider address="0x123">
      <SelectedMarketProvider marketId={marketId}>
        {children}
      </SelectedMarketProvider>
    </WebSocketProvider>
  );
}

describe('SelectedMarketProvider', () => {
  beforeEach(() => {
    installMockWebSocket();
    mockGetMarketById.mockReset();
  });

  afterEach(() => {
    MockWebSocket.clearInstances();
  });

  it('fetches market data when marketId is provided', async () => {
    mockGetMarketById.mockResolvedValueOnce({
      market: {
        id: 'game1-pitching-1',
        gameId: 'game1',
        categoryId: 'pitching',
        status: 'OPEN',
        outcome: null,
        quantities: [0, 0],
        b: 100,
        qBall: 0,
        qStrike: 0,
      },
      prices: [0.5, 0.5],
      outcomes: ['BALL', 'STRIKE'],
      priceBall: 0.5,
      priceStrike: 0.5,
    });

    render(
      <TestWrapper marketId="game1-pitching-1">
        <MarketConsumer />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('yes');

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no');
    });

    expect(screen.getByTestId('market-id')).toHaveTextContent('game1-pitching-1');
    expect(screen.getByTestId('prices')).toHaveTextContent('[0.5,0.5]');
    expect(screen.getByTestId('outcomes')).toHaveTextContent('["BALL","STRIKE"]');
    expect(mockGetMarketById).toHaveBeenCalledWith('game1-pitching-1');
  });

  it('sets no market when marketId is null', async () => {
    render(
      <TestWrapper marketId={null}>
        <MarketConsumer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no');
    });

    expect(screen.getByTestId('market-id')).toHaveTextContent('no-market');
    expect(mockGetMarketById).not.toHaveBeenCalled();
  });

  it('handles fetch error', async () => {
    mockGetMarketById.mockRejectedValueOnce(new Error('Not found'));

    render(
      <TestWrapper marketId="nonexistent">
        <MarketConsumer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Not found');
    });
  });

  it('updates prices from ODDS_UPDATE matching marketId', async () => {
    mockGetMarketById.mockResolvedValueOnce({
      market: {
        id: 'game1-pitching-1',
        gameId: 'game1',
        categoryId: 'pitching',
        status: 'OPEN',
        outcome: null,
        quantities: [0, 0],
        b: 100,
        qBall: 0,
        qStrike: 0,
      },
      prices: [0.5, 0.5],
      outcomes: ['BALL', 'STRIKE'],
      priceBall: 0.5,
      priceStrike: 0.5,
    });

    render(
      <TestWrapper marketId="game1-pitching-1">
        <MarketConsumer />
      </TestWrapper>
    );

    const ws = MockWebSocket.getLastInstance()!;

    await act(async () => {
      ws.simulateOpen();
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no');
    });

    await act(async () => {
      ws.simulateMessage({
        type: 'ODDS_UPDATE',
        prices: [0.65, 0.35],
        quantities: [10, 5],
        outcomes: ['BALL', 'STRIKE'],
        marketId: 'game1-pitching-1',
        priceBall: 0.65,
        priceStrike: 0.35,
        qBall: 10,
        qStrike: 5,
      });
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.getByTestId('prices')).toHaveTextContent('[0.65,0.35]');
      expect(screen.getByTestId('quantities')).toHaveTextContent('[10,5]');
    });
  });

  it('ignores ODDS_UPDATE for different marketId', async () => {
    mockGetMarketById.mockResolvedValueOnce({
      market: {
        id: 'game1-pitching-1',
        gameId: 'game1',
        categoryId: 'pitching',
        status: 'OPEN',
        outcome: null,
        quantities: [0, 0],
        b: 100,
        qBall: 0,
        qStrike: 0,
      },
      prices: [0.5, 0.5],
      outcomes: ['BALL', 'STRIKE'],
      priceBall: 0.5,
      priceStrike: 0.5,
    });

    render(
      <TestWrapper marketId="game1-pitching-1">
        <MarketConsumer />
      </TestWrapper>
    );

    const ws = MockWebSocket.getLastInstance()!;

    await act(async () => {
      ws.simulateOpen();
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no');
    });

    // Send ODDS_UPDATE for a different market
    await act(async () => {
      ws.simulateMessage({
        type: 'ODDS_UPDATE',
        prices: [0.8, 0.2],
        quantities: [50, 10],
        outcomes: ['BALL', 'STRIKE'],
        marketId: 'other-market',
        priceBall: 0.8,
        priceStrike: 0.2,
        qBall: 50,
        qStrike: 10,
      });
      await flushPromises();
    });

    // Prices should remain unchanged
    expect(screen.getByTestId('prices')).toHaveTextContent('[0.5,0.5]');
  });

  it('updates market status from MARKET_STATUS matching marketId', async () => {
    mockGetMarketById.mockResolvedValueOnce({
      market: {
        id: 'game1-pitching-1',
        gameId: 'game1',
        categoryId: 'pitching',
        status: 'OPEN',
        outcome: null,
        quantities: [10, 5],
        b: 100,
        qBall: 10,
        qStrike: 5,
      },
      prices: [0.55, 0.45],
      outcomes: ['BALL', 'STRIKE'],
      priceBall: 0.55,
      priceStrike: 0.45,
    });

    render(
      <TestWrapper marketId="game1-pitching-1">
        <MarketConsumer />
      </TestWrapper>
    );

    const ws = MockWebSocket.getLastInstance()!;

    await act(async () => {
      ws.simulateOpen();
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.getByTestId('market-status')).toHaveTextContent('OPEN');
    });

    await act(async () => {
      ws.simulateMessage({
        type: 'MARKET_STATUS',
        status: 'CLOSED',
        marketId: 'game1-pitching-1',
      });
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.getByTestId('market-status')).toHaveTextContent('CLOSED');
    });
  });

  it('refetches on MARKET_STATUS RESOLVED for matching marketId', async () => {
    mockGetMarketById
      .mockResolvedValueOnce({
        market: {
          id: 'game1-pitching-1',
          gameId: 'game1',
          categoryId: 'pitching',
          status: 'OPEN',
          outcome: null,
          quantities: [10, 5],
          b: 100,
          qBall: 10,
          qStrike: 5,
        },
        prices: [0.55, 0.45],
        outcomes: ['BALL', 'STRIKE'],
        priceBall: 0.55,
        priceStrike: 0.45,
      })
      .mockResolvedValueOnce({
        market: {
          id: 'game1-pitching-1',
          gameId: 'game1',
          categoryId: 'pitching',
          status: 'RESOLVED',
          outcome: 'BALL',
          quantities: [10, 5],
          b: 100,
          qBall: 10,
          qStrike: 5,
        },
        prices: [0.55, 0.45],
        outcomes: ['BALL', 'STRIKE'],
        priceBall: 0.55,
        priceStrike: 0.45,
      });

    render(
      <TestWrapper marketId="game1-pitching-1">
        <MarketConsumer />
      </TestWrapper>
    );

    const ws = MockWebSocket.getLastInstance()!;

    await act(async () => {
      ws.simulateOpen();
      await flushPromises();
    });

    await waitFor(() => {
      expect(screen.getByTestId('market-status')).toHaveTextContent('OPEN');
    });

    // RESOLVED triggers refetch
    await act(async () => {
      ws.simulateMessage({
        type: 'MARKET_STATUS',
        status: 'RESOLVED',
        marketId: 'game1-pitching-1',
        outcome: 'BALL',
      });
      await flushPromises();
    });

    await waitFor(() => {
      expect(mockGetMarketById).toHaveBeenCalledTimes(2);
    });
  });

  it('works with 3-outcome markets', async () => {
    mockGetMarketById.mockResolvedValueOnce({
      market: {
        id: 'game1-freethrow-1',
        gameId: 'game1',
        categoryId: 'free-throw',
        status: 'OPEN',
        outcome: null,
        quantities: [0, 0, 0],
        b: 100,
        qBall: 0,
        qStrike: 0,
      },
      prices: [0.333, 0.333, 0.333],
      outcomes: ['MAKE', 'MISS', 'FOUL'],
      priceBall: 0.333,
      priceStrike: 0.333,
    });

    render(
      <TestWrapper marketId="game1-freethrow-1">
        <MarketConsumer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no');
    });

    expect(screen.getByTestId('outcomes')).toHaveTextContent('["MAKE","MISS","FOUL"]');
    expect(screen.getByTestId('quantities')).toHaveTextContent('[0,0,0]');
  });
});
