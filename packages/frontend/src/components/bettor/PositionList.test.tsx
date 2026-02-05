import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PositionList } from './PositionList';
import * as WagmiProvider from '@/providers/WagmiProvider';
import * as MarketProvider from '@/providers/MarketProvider';
import * as WebSocketProvider from '@/providers/WebSocketProvider';
import * as api from '@/lib/api';
import { MockWebSocket, installMockWebSocket } from '@/test/mocks/websocket';

jest.mock('@/providers/WagmiProvider', () => ({
  useWallet: jest.fn(),
}));

jest.mock('@/providers/MarketProvider', () => ({
  useMarket: jest.fn(),
}));

jest.mock('@/providers/WebSocketProvider', () => ({
  useWebSocket: jest.fn(),
}));

jest.mock('@/lib/api');

const mockUseWallet = WagmiProvider.useWallet as jest.Mock;
const mockUseMarket = MarketProvider.useMarket as jest.Mock;
const mockUseWebSocket = WebSocketProvider.useWebSocket as jest.Mock;
const mockGetPositions = api.getPositions as jest.MockedFunction<
  typeof api.getPositions
>;

describe('PositionList', () => {
  beforeEach(() => {
    installMockWebSocket();
    mockUseWallet.mockReturnValue({
      address: '0x123',
      isConfigured: true,
    });
    mockUseMarket.mockReturnValue({
      market: { id: 'market-1', status: 'OPEN' },
    });
    mockUseWebSocket.mockReturnValue({
      isConnected: true,
      subscribe: jest.fn(() => () => {}),
    });
    mockGetPositions.mockReset();
  });

  afterEach(() => {
    MockWebSocket.clearInstances();
  });

  it('shows message when no wallet connected', () => {
    mockUseWallet.mockReturnValue({
      address: undefined,
      isConfigured: false,
    });

    render(<PositionList />);

    expect(screen.getByTestId('no-wallet')).toHaveTextContent(
      'Connect wallet to view positions'
    );
  });

  it('shows loading state', () => {
    mockGetPositions.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<PositionList />);

    expect(screen.getByTestId('positions-loading')).toBeInTheDocument();
  });

  it('shows no positions message when empty', async () => {
    mockGetPositions.mockResolvedValueOnce({ positions: [] });

    render(<PositionList />);

    await waitFor(() => {
      expect(screen.getByTestId('no-positions')).toHaveTextContent(
        'No positions in current market'
      );
    });
  });

  it('displays positions', async () => {
    mockGetPositions.mockResolvedValueOnce({
      positions: [
        {
          marketId: 'market-1',
          outcome: 'Ball',
          shares: 10.5,
          costPaid: 5.25,
          appSessionId: 'session-1',
          timestamp: Date.now(),
        },
      ],
    });

    render(<PositionList />);

    await waitFor(() => {
      expect(screen.getByTestId('position-market-1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('position-outcome')).toHaveTextContent('Ball');
    expect(screen.getByTestId('position-shares')).toHaveTextContent('10.50');
    expect(screen.getByTestId('position-cost')).toHaveTextContent('$5.25');
  });
});
