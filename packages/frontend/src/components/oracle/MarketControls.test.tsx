import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarketControls } from './MarketControls';
import * as SelectedMarketProvider from '@/providers/SelectedMarketProvider';
import * as api from '@/lib/api';

jest.mock('@/providers/SelectedMarketProvider', () => ({
  useSelectedMarket: jest.fn(),
}));

jest.mock('@/lib/api');

const mockUseSelectedMarket = SelectedMarketProvider.useSelectedMarket as jest.Mock;
const mockOpenMarket = api.openMarket as jest.MockedFunction<typeof api.openMarket>;
const mockCloseMarket = api.closeMarket as jest.MockedFunction<
  typeof api.closeMarket
>;
const mockResolveOutcome = api.resolveOutcome as jest.MockedFunction<
  typeof api.resolveOutcome
>;
const mockCreateGame = api.createGame as jest.MockedFunction<typeof api.createGame>;
const mockActivateGame = api.activateGame as jest.MockedFunction<typeof api.activateGame>;

describe('MarketControls', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    mockUseSelectedMarket.mockReturnValue({
      market: null,
      outcomes: ['BALL', 'STRIKE'],
      refetch: mockRefetch,
    });
    mockOpenMarket.mockReset();
    mockCloseMarket.mockReset();
    mockResolveOutcome.mockReset();
    mockRefetch.mockReset();
    mockCreateGame.mockReset();
    mockActivateGame.mockReset();
    mockCreateGame.mockResolvedValue({ success: true, game: { id: 'game-1', sportId: 'baseball', homeTeam: 'Demo Home', awayTeam: 'Demo Away', status: 'ACTIVE' as const, startedAt: Date.now(), completedAt: null, metadata: null, createdAt: Date.now() } });
    mockActivateGame.mockResolvedValue({ success: true, game: { id: 'game-1', sportId: 'baseball', homeTeam: 'Demo Home', awayTeam: 'Demo Away', status: 'ACTIVE' as const, startedAt: Date.now(), completedAt: null, metadata: null, createdAt: Date.now() } });
  });

  it('shows NO MARKET when no market exists', () => {
    render(<MarketControls />);

    expect(screen.getByTestId('market-status')).toHaveTextContent('NO MARKET');
  });

  it('shows OPEN status when market is open', () => {
    mockUseSelectedMarket.mockReturnValue({
      market: { id: 'market-1', status: 'OPEN' },
      outcomes: ['BALL', 'STRIKE'],
      refetch: mockRefetch,
    });

    render(<MarketControls />);

    expect(screen.getByTestId('market-status')).toHaveTextContent('OPEN');
  });

  it('opens market on button click', async () => {
    const user = userEvent.setup();
    mockOpenMarket.mockResolvedValueOnce({ success: true, marketId: 'game-1-pitching-1' });

    render(<MarketControls />);

    await user.click(screen.getByTestId('open-market-button'));

    await waitFor(() => {
      expect(mockCreateGame).toHaveBeenCalledWith('baseball', 'Demo Home', 'Demo Away');
    });
    expect(mockActivateGame).toHaveBeenCalledWith('game-1');
    expect(mockOpenMarket).toHaveBeenCalledWith({ gameId: 'game-1', categoryId: 'pitching' });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('closes market on button click', async () => {
    const user = userEvent.setup();
    mockUseSelectedMarket.mockReturnValue({
      market: { id: 'market-1', status: 'OPEN' },
      outcomes: ['BALL', 'STRIKE'],
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
    mockUseSelectedMarket.mockReturnValue({
      market: { id: 'market-1', status: 'CLOSED' },
      outcomes: ['BALL', 'STRIKE'],
      refetch: mockRefetch,
    });
    mockResolveOutcome.mockResolvedValueOnce({
      success: true,
      marketId: 'market-1',
      outcome: 'BALL',
      winners: 1,
      losers: 1,
      totalPayout: 15,
    });

    render(<MarketControls />);

    await user.click(screen.getByTestId('resolve-ball-button'));

    await waitFor(() => {
      expect(mockResolveOutcome).toHaveBeenCalledWith({ outcome: 'BALL' });
    });

    expect(screen.getByTestId('resolve-result')).toHaveTextContent('1 winners');
    expect(screen.getByTestId('resolve-result')).toHaveTextContent('1 losers');
  });

  it('renders dynamic resolve buttons for 3 outcomes', () => {
    mockUseSelectedMarket.mockReturnValue({
      market: { id: 'market-1', status: 'CLOSED' },
      outcomes: ['MAKE', 'MISS', 'FOUL'],
      refetch: mockRefetch,
    });

    render(<MarketControls />);

    expect(screen.getByTestId('resolve-make-button')).toBeInTheDocument();
    expect(screen.getByTestId('resolve-miss-button')).toBeInTheDocument();
    expect(screen.getByTestId('resolve-foul-button')).toBeInTheDocument();
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
