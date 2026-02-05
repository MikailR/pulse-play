import { render, screen } from '@testing-library/react';
import { OddsDisplay } from './OddsDisplay';
import * as MarketProvider from '@/providers/MarketProvider';

jest.mock('@/providers/MarketProvider', () => ({
  useMarket: jest.fn(),
}));

const mockUseMarket = MarketProvider.useMarket as jest.Mock;

describe('OddsDisplay', () => {
  beforeEach(() => {
    mockUseMarket.mockReturnValue({
      priceBall: 0.5,
      priceStrike: 0.5,
      market: { id: 'market-1', status: 'OPEN' },
      isLoading: false,
    });
  });

  it('shows loading state', () => {
    mockUseMarket.mockReturnValue({
      priceBall: 0.5,
      priceStrike: 0.5,
      market: null,
      isLoading: true,
    });

    render(<OddsDisplay />);

    expect(screen.getByTestId('odds-loading')).toBeInTheDocument();
  });

  it('displays ball and strike prices as percentages', () => {
    mockUseMarket.mockReturnValue({
      priceBall: 0.6,
      priceStrike: 0.4,
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
    mockUseMarket.mockReturnValue({
      priceBall: 0.5,
      priceStrike: 0.5,
      market: null,
      isLoading: false,
    });

    render(<OddsDisplay />);

    expect(screen.getByTestId('market-status-badge')).toHaveTextContent('NO MARKET');
  });
});
