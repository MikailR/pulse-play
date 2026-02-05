import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BetForm } from './BetForm';
import * as MarketProvider from '@/providers/MarketProvider';
import * as WagmiProvider from '@/providers/WagmiProvider';
import * as api from '@/lib/api';

jest.mock('@/providers/MarketProvider', () => ({
  useMarket: jest.fn(),
}));

jest.mock('@/providers/WagmiProvider', () => ({
  useWallet: jest.fn(),
}));

jest.mock('@/lib/api');

const mockUseMarket = MarketProvider.useMarket as jest.Mock;
const mockUseWallet = WagmiProvider.useWallet as jest.Mock;
const mockPlaceBet = api.placeBet as jest.MockedFunction<typeof api.placeBet>;

describe('BetForm', () => {
  beforeEach(() => {
    mockUseMarket.mockReturnValue({
      market: { id: 'market-1', status: 'OPEN' },
      priceBall: 0.5,
      priceStrike: 0.5,
    });
    mockUseWallet.mockReturnValue({
      address: '0x123',
      isConfigured: true,
    });
    mockPlaceBet.mockReset();
  });

  it('renders bet form with outcome buttons', () => {
    render(<BetForm />);

    expect(screen.getByTestId('bet-form')).toBeInTheDocument();
    expect(screen.getByTestId('outcome-ball')).toBeInTheDocument();
    expect(screen.getByTestId('outcome-strike')).toBeInTheDocument();
    expect(screen.getByTestId('amount-input')).toBeInTheDocument();
  });

  it('shows warning when market is not open', () => {
    mockUseMarket.mockReturnValue({
      market: { id: 'market-1', status: 'CLOSED' },
      priceBall: 0.5,
      priceStrike: 0.5,
    });

    render(<BetForm />);

    expect(screen.getByTestId('market-closed-warning')).toHaveTextContent(
      'Market is not open'
    );
  });

  it('selects outcome when clicked', async () => {
    const user = userEvent.setup();
    render(<BetForm />);

    await user.click(screen.getByTestId('outcome-ball'));

    expect(screen.getByTestId('outcome-ball')).toHaveClass('border-blue-500');
  });

  it('updates amount from preset buttons', async () => {
    const user = userEvent.setup();
    render(<BetForm />);

    await user.click(screen.getByTestId('preset-10'));

    expect(screen.getByTestId('amount-input')).toHaveValue(10);
  });

  it('places bet when form is submitted', async () => {
    const user = userEvent.setup();
    mockPlaceBet.mockResolvedValueOnce({
      accepted: true,
      shares: 9.5,
      newPriceBall: 0.55,
      newPriceStrike: 0.45,
    });

    const onBetPlaced = jest.fn();
    render(<BetForm onBetPlaced={onBetPlaced} />);

    await user.click(screen.getByTestId('outcome-ball'));
    await user.type(screen.getByTestId('amount-input'), '10');
    await user.click(screen.getByTestId('place-bet-button'));

    await waitFor(() => {
      expect(mockPlaceBet).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'BALL',
          amount: 10,
        })
      );
    });

    await waitFor(() => {
      expect(onBetPlaced).toHaveBeenCalledWith('BALL', 9.5);
    });
  });
});
