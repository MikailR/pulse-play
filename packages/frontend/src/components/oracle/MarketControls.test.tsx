import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarketControls } from './MarketControls';
import * as MarketProvider from '@/providers/MarketProvider';
import * as api from '@/lib/api';

jest.mock('@/providers/MarketProvider', () => ({
  useMarket: jest.fn(),
}));

jest.mock('@/lib/api');

const mockUseMarket = MarketProvider.useMarket as jest.Mock;
const mockOpenMarket = api.openMarket as jest.MockedFunction<typeof api.openMarket>;
const mockCloseMarket = api.closeMarket as jest.MockedFunction<
  typeof api.closeMarket
>;
const mockResolveOutcome = api.resolveOutcome as jest.MockedFunction<
  typeof api.resolveOutcome
>;

describe('MarketControls', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    mockUseMarket.mockReturnValue({
      market: null,
      gameActive: true,
      refetch: mockRefetch,
    });
    mockOpenMarket.mockReset();
    mockCloseMarket.mockReset();
    mockResolveOutcome.mockReset();
    mockRefetch.mockReset();
  });

  it('shows NO MARKET when no market exists', () => {
    render(<MarketControls />);

    expect(screen.getByTestId('market-status')).toHaveTextContent('NO MARKET');
  });

  it('shows OPEN status when market is open', () => {
    mockUseMarket.mockReturnValue({
      market: { id: 'market-1', status: 'OPEN' },
      gameActive: true,
      refetch: mockRefetch,
    });

    render(<MarketControls />);

    expect(screen.getByTestId('market-status')).toHaveTextContent('OPEN');
  });

  it('opens market on button click', async () => {
    const user = userEvent.setup();
    mockOpenMarket.mockResolvedValueOnce({ success: true, marketId: 'market-1' });

    render(<MarketControls />);

    await user.click(screen.getByTestId('open-market-button'));

    await waitFor(() => {
      expect(mockOpenMarket).toHaveBeenCalled();
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('closes market on button click', async () => {
    const user = userEvent.setup();
    mockUseMarket.mockReturnValue({
      market: { id: 'market-1', status: 'OPEN' },
      gameActive: true,
      refetch: mockRefetch,
    });
    mockCloseMarket.mockResolvedValueOnce({ success: true, marketId: 'market-1' });

    render(<MarketControls />);

    await user.click(screen.getByTestId('close-market-button'));

    await waitFor(() => {
      expect(mockCloseMarket).toHaveBeenCalled();
    });
  });

  it('resolves market with outcome', async () => {
    const user = userEvent.setup();
    mockUseMarket.mockReturnValue({
      market: { id: 'market-1', status: 'CLOSED' },
      gameActive: true,
      refetch: mockRefetch,
    });
    mockResolveOutcome.mockResolvedValueOnce({
      success: true,
      winners: ['0x111'],
      losers: ['0x222'],
      totalPayout: 15,
    });

    render(<MarketControls />);

    await user.click(screen.getByTestId('resolve-ball-button'));

    await waitFor(() => {
      expect(mockResolveOutcome).toHaveBeenCalledWith({ outcome: 'Ball' });
    });

    expect(screen.getByTestId('resolve-result')).toHaveTextContent('1 winners');
    expect(screen.getByTestId('resolve-result')).toHaveTextContent('1 losers');
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    mockOpenMarket.mockRejectedValueOnce(new Error('Server error'));

    render(<MarketControls />);

    await user.click(screen.getByTestId('open-market-button'));

    await waitFor(() => {
      expect(screen.getByTestId('market-error')).toHaveTextContent('Server error');
    });
  });
});
