import { render, screen } from '@testing-library/react';
import { StateDisplay } from './StateDisplay';
import * as SelectedMarketProvider from '@/providers/SelectedMarketProvider';

jest.mock('@/providers/SelectedMarketProvider', () => ({
  useSelectedMarket: jest.fn(),
}));

const mockUseSelectedMarket = SelectedMarketProvider.useSelectedMarket as jest.Mock;

describe('StateDisplay', () => {
  beforeEach(() => {
    mockUseSelectedMarket.mockReset();
  });

  it('shows loading state when isLoading is true', () => {
    mockUseSelectedMarket.mockReturnValue({
      market: null,
      outcomes: [],
      isLoading: true,
      error: null,
    });

    render(<StateDisplay />);

    expect(screen.getByTestId('state-loading')).toBeInTheDocument();
  });

  it('shows error state when error exists', () => {
    mockUseSelectedMarket.mockReturnValue({
      market: null,
      outcomes: [],
      isLoading: false,
      error: 'Network error',
    });

    render(<StateDisplay />);

    expect(screen.getByTestId('state-error')).toBeInTheDocument();
    expect(screen.getByTestId('state-error')).toHaveTextContent('Network error');
  });

  it('displays system state from context and props', () => {
    mockUseSelectedMarket.mockReturnValue({
      market: {
        id: 'market-1',
        status: 'OPEN',
        outcome: null,
        quantities: [0, 0],
        b: 100,
      },
      outcomes: ['BALL', 'STRIKE'],
      isLoading: false,
      error: null,
    });

    render(
      <StateDisplay
        gameActive={true}
        positionCount={5}
        connectionCount={3}
      />
    );

    expect(screen.getByTestId('state-display')).toBeInTheDocument();
    expect(screen.getByTestId('state-game-active')).toHaveTextContent('Yes');
    expect(screen.getByTestId('state-market-id')).toHaveTextContent('market-1');
    expect(screen.getByTestId('state-market-status')).toHaveTextContent('OPEN');
    expect(screen.getByTestId('state-position-count')).toHaveTextContent('5');
    expect(screen.getByTestId('state-connection-count')).toHaveTextContent('3');
    expect(screen.getByTestId('state-outcomes')).toHaveTextContent('BALL, STRIKE');
  });

  it('shows game inactive state', () => {
    mockUseSelectedMarket.mockReturnValue({
      market: null,
      outcomes: [],
      isLoading: false,
      error: null,
    });

    render(<StateDisplay gameActive={false} connectionCount={1} />);

    expect(screen.getByTestId('state-game-active')).toHaveTextContent('No');
    expect(screen.getByTestId('state-market-id')).toHaveTextContent('-');
    expect(screen.getByTestId('state-market-status')).toHaveTextContent('None');
  });
});
