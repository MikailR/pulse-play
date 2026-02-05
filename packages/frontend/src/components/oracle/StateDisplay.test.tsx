import { render, screen } from '@testing-library/react';
import { StateDisplay } from './StateDisplay';
import * as MarketProvider from '@/providers/MarketProvider';

jest.mock('@/providers/MarketProvider', () => ({
  useMarket: jest.fn(),
}));

const mockUseMarket = MarketProvider.useMarket as jest.Mock;

describe('StateDisplay', () => {
  beforeEach(() => {
    mockUseMarket.mockReset();
  });

  it('shows loading state when isLoading is true', () => {
    mockUseMarket.mockReturnValue({
      market: null,
      gameActive: false,
      positionCount: 0,
      connectionCount: 0,
      isLoading: true,
      error: null,
    });

    render(<StateDisplay />);

    expect(screen.getByTestId('state-loading')).toBeInTheDocument();
  });

  it('shows error state when error exists', () => {
    mockUseMarket.mockReturnValue({
      market: null,
      gameActive: false,
      positionCount: 0,
      connectionCount: 0,
      isLoading: false,
      error: 'Network error',
    });

    render(<StateDisplay />);

    expect(screen.getByTestId('state-error')).toBeInTheDocument();
    expect(screen.getByTestId('state-error')).toHaveTextContent('Network error');
  });

  it('displays system state from context', () => {
    mockUseMarket.mockReturnValue({
      market: {
        id: 'market-1',
        status: 'OPEN',
        outcome: null,
        qBall: 0,
        qStrike: 0,
        b: 100,
      },
      gameActive: true,
      positionCount: 5,
      connectionCount: 3,
      isLoading: false,
      error: null,
    });

    render(<StateDisplay />);

    expect(screen.getByTestId('state-display')).toBeInTheDocument();
    expect(screen.getByTestId('state-game-active')).toHaveTextContent('Yes');
    expect(screen.getByTestId('state-market-id')).toHaveTextContent('market-1');
    expect(screen.getByTestId('state-market-status')).toHaveTextContent('OPEN');
    expect(screen.getByTestId('state-position-count')).toHaveTextContent('5');
    expect(screen.getByTestId('state-connection-count')).toHaveTextContent('3');
  });

  it('shows game inactive state', () => {
    mockUseMarket.mockReturnValue({
      market: null,
      gameActive: false,
      positionCount: 0,
      connectionCount: 1,
      isLoading: false,
      error: null,
    });

    render(<StateDisplay />);

    expect(screen.getByTestId('state-game-active')).toHaveTextContent('No');
    expect(screen.getByTestId('state-market-id')).toHaveTextContent('-');
    expect(screen.getByTestId('state-market-status')).toHaveTextContent('None');
  });
});
