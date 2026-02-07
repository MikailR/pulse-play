import { render, screen } from '@testing-library/react';
import { OddsDisplay } from './OddsDisplay';
import * as SelectedMarketProvider from '@/providers/SelectedMarketProvider';

jest.mock('@/providers/SelectedMarketProvider', () => ({
  useSelectedMarket: jest.fn(),
}));

const mockUseSelectedMarket = SelectedMarketProvider.useSelectedMarket as jest.Mock;

describe('OddsDisplay', () => {
  beforeEach(() => {
    mockUseSelectedMarket.mockReturnValue({
      prices: [0.5, 0.5],
      outcomes: ['BALL', 'STRIKE'],
      market: { id: 'market-1', status: 'OPEN' },
      isLoading: false,
    });
  });

  it('shows loading state', () => {
    mockUseSelectedMarket.mockReturnValue({
      prices: [0.5, 0.5],
      outcomes: ['BALL', 'STRIKE'],
      market: null,
      isLoading: true,
    });

    render(<OddsDisplay />);

    expect(screen.getByTestId('odds-loading')).toBeInTheDocument();
  });

  it('displays prices as percentages for 2 outcomes', () => {
    mockUseSelectedMarket.mockReturnValue({
      prices: [0.6, 0.4],
      outcomes: ['BALL', 'STRIKE'],
      market: { id: 'market-1', status: 'OPEN' },
      isLoading: false,
    });

    render(<OddsDisplay />);

    expect(screen.getByTestId('price-ball-percent')).toHaveTextContent('60.0%');
    expect(screen.getByTestId('price-strike-percent')).toHaveTextContent('40.0%');
  });

  it('shows market status badge', () => {
    render(<OddsDisplay />);

    expect(screen.getByTestId('market-status-badge')).toHaveTextContent('OPEN');
  });

  it('shows NO MARKET when market is null', () => {
    mockUseSelectedMarket.mockReturnValue({
      prices: [0.5, 0.5],
      outcomes: ['BALL', 'STRIKE'],
      market: null,
      isLoading: false,
    });

    render(<OddsDisplay />);

    expect(screen.getByTestId('market-status-badge')).toHaveTextContent('NO MARKET');
  });

  it('renders 3-outcome market dynamically', () => {
    mockUseSelectedMarket.mockReturnValue({
      prices: [0.4, 0.35, 0.25],
      outcomes: ['MAKE', 'MISS', 'FOUL'],
      market: { id: 'market-2', status: 'OPEN' },
      isLoading: false,
    });

    render(<OddsDisplay />);

    expect(screen.getByTestId('odds-make')).toBeInTheDocument();
    expect(screen.getByTestId('odds-miss')).toBeInTheDocument();
    expect(screen.getByTestId('odds-foul')).toBeInTheDocument();
    expect(screen.getByTestId('price-make-percent')).toHaveTextContent('40.0%');
    expect(screen.getByTestId('price-miss-percent')).toHaveTextContent('35.0%');
    expect(screen.getByTestId('price-foul-percent')).toHaveTextContent('25.0%');
  });

  it('displays American odds correctly', () => {
    mockUseSelectedMarket.mockReturnValue({
      prices: [0.6, 0.4],
      outcomes: ['BALL', 'STRIKE'],
      market: { id: 'market-1', status: 'OPEN' },
      isLoading: false,
    });

    render(<OddsDisplay />);

    // 0.6 → -150 (favorite)
    expect(screen.getByTestId('price-ball-american')).toHaveTextContent('-150');
    // 0.4 → +150 (underdog)
    expect(screen.getByTestId('price-strike-american')).toHaveTextContent('+150');
  });
});
