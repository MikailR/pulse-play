import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameControls } from './GameControls';
import * as api from '@/lib/api';
import type { Game } from '@/lib/types';

jest.mock('@/lib/api');

const mockActivateGame = api.activateGame as jest.MockedFunction<typeof api.activateGame>;
const mockCompleteGame = api.completeGame as jest.MockedFunction<typeof api.completeGame>;

const activeGame: Game = {
  id: 'game-1',
  sportId: 'baseball',
  homeTeamId: 'nyy',
  awayTeamId: 'bos',
  status: 'ACTIVE',
  startedAt: Date.now(),
  completedAt: null,
  imagePath: null,
  metadata: null,
  createdAt: Date.now(),
};

const scheduledGame: Game = {
  ...activeGame,
  status: 'SCHEDULED',
  startedAt: null,
};

const completedGame: Game = {
  ...activeGame,
  status: 'COMPLETED',
  completedAt: Date.now(),
};

describe('GameControls', () => {
  const mockOnStateChanged = jest.fn();

  beforeEach(() => {
    mockActivateGame.mockReset();
    mockCompleteGame.mockReset();
    mockOnStateChanged.mockReset();
  });

  it('shows NO GAME when game is null', () => {
    render(<GameControls game={null} onStateChanged={mockOnStateChanged} />);

    expect(screen.getByTestId('game-status')).toHaveTextContent('NO GAME');
  });

  it('shows ACTIVE status when game is active', () => {
    render(<GameControls game={activeGame} onStateChanged={mockOnStateChanged} />);

    expect(screen.getByTestId('game-status')).toHaveTextContent('ACTIVE');
  });

  it('shows Activate button for SCHEDULED games', () => {
    render(<GameControls game={scheduledGame} onStateChanged={mockOnStateChanged} />);

    expect(screen.getByTestId('game-activate-button')).toHaveTextContent('Activate Game');
  });

  it('shows Complete button for ACTIVE games', () => {
    render(<GameControls game={activeGame} onStateChanged={mockOnStateChanged} />);

    expect(screen.getByTestId('game-complete-button')).toHaveTextContent('Complete Game');
  });

  it('activates game on button click', async () => {
    const user = userEvent.setup();
    mockActivateGame.mockResolvedValueOnce({ success: true, game: activeGame });

    render(<GameControls game={scheduledGame} onStateChanged={mockOnStateChanged} />);

    await user.click(screen.getByTestId('game-activate-button'));

    await waitFor(() => {
      expect(mockActivateGame).toHaveBeenCalledWith('game-1');
    });
    expect(mockOnStateChanged).toHaveBeenCalled();
  });

  it('completes game on button click', async () => {
    const user = userEvent.setup();
    mockCompleteGame.mockResolvedValueOnce({ success: true, game: completedGame });

    render(<GameControls game={activeGame} onStateChanged={mockOnStateChanged} />);

    await user.click(screen.getByTestId('game-complete-button'));

    await waitFor(() => {
      expect(mockCompleteGame).toHaveBeenCalledWith('game-1');
    });
    expect(mockOnStateChanged).toHaveBeenCalled();
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    mockCompleteGame.mockRejectedValueOnce(new Error('Network error'));

    render(<GameControls game={activeGame} onStateChanged={mockOnStateChanged} />);

    await user.click(screen.getByTestId('game-complete-button'));

    await waitFor(() => {
      expect(screen.getByTestId('game-error')).toHaveTextContent('Network error');
    });
  });

  it('shows completed message for COMPLETED games', () => {
    render(<GameControls game={completedGame} onStateChanged={mockOnStateChanged} />);

    expect(screen.getByTestId('game-status')).toHaveTextContent('COMPLETED');
    expect(screen.getByText('Game has been completed.')).toBeInTheDocument();
  });
});
