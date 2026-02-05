import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameControls } from './GameControls';
import * as MarketProvider from '@/providers/MarketProvider';
import * as api from '@/lib/api';

jest.mock('@/providers/MarketProvider', () => ({
  useMarket: jest.fn(),
}));

jest.mock('@/lib/api');

const mockUseMarket = MarketProvider.useMarket as jest.Mock;
const mockSetGameState = api.setGameState as jest.MockedFunction<
  typeof api.setGameState
>;

describe('GameControls', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    mockUseMarket.mockReturnValue({
      gameActive: false,
      refetch: mockRefetch,
    });
    mockSetGameState.mockReset();
    mockRefetch.mockReset();
  });

  it('shows inactive status when game is not active', () => {
    render(<GameControls />);

    expect(screen.getByTestId('game-status')).toHaveTextContent('INACTIVE');
    expect(screen.getByTestId('game-toggle-button')).toHaveTextContent(
      'Activate Game'
    );
  });

  it('shows active status when game is active', () => {
    mockUseMarket.mockReturnValue({
      gameActive: true,
      refetch: mockRefetch,
    });

    render(<GameControls />);

    expect(screen.getByTestId('game-status')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('game-toggle-button')).toHaveTextContent(
      'Deactivate Game'
    );
  });

  it('activates game on button click', async () => {
    const user = userEvent.setup();
    mockSetGameState.mockResolvedValueOnce({ success: true });

    render(<GameControls />);

    await user.click(screen.getByTestId('game-toggle-button'));

    await waitFor(() => {
      expect(mockSetGameState).toHaveBeenCalledWith({ active: true });
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    mockSetGameState.mockRejectedValueOnce(new Error('Network error'));

    render(<GameControls />);

    await user.click(screen.getByTestId('game-toggle-button'));

    await waitFor(() => {
      expect(screen.getByTestId('game-error')).toHaveTextContent('Network error');
    });
  });
});
