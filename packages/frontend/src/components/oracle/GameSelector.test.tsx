import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameSelector } from './GameSelector';
import * as api from '@/lib/api';
import type { Game } from '@/lib/types';

jest.mock('@/lib/api');

const mockGetGames = api.getGames as jest.MockedFunction<typeof api.getGames>;
const mockGetSports = api.getSports as jest.MockedFunction<typeof api.getSports>;
const mockCreateGame = api.createGame as jest.MockedFunction<typeof api.createGame>;
const mockActivateGame = api.activateGame as jest.MockedFunction<typeof api.activateGame>;

const baseGame: Game = {
  id: 'game-1',
  sportId: 'baseball',
  homeTeam: 'Yankees',
  awayTeam: 'Red Sox',
  status: 'ACTIVE',
  startedAt: Date.now(),
  completedAt: null,
  metadata: null,
  createdAt: Date.now(),
};

describe('GameSelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockGetGames.mockReset();
    mockGetSports.mockReset();
    mockCreateGame.mockReset();
    mockActivateGame.mockReset();
    mockOnSelect.mockReset();
    mockGetSports.mockResolvedValue({
      sports: [
        { id: 'baseball', name: 'Baseball', description: null, createdAt: Date.now() },
      ],
    });
  });

  it('shows loading state initially', () => {
    mockGetGames.mockReturnValue(new Promise(() => {}));
    render(<GameSelector selected={null} onSelect={mockOnSelect} />);

    expect(screen.getByTestId('game-selector-loading')).toBeInTheDocument();
  });

  it('renders game list', async () => {
    mockGetGames.mockResolvedValueOnce({ games: [baseGame] });

    render(<GameSelector selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('game-selector-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('game-option-game-1')).toBeInTheDocument();
    expect(screen.getByText('Yankees vs Red Sox')).toBeInTheDocument();
  });

  it('shows empty state when no games', async () => {
    mockGetGames.mockResolvedValueOnce({ games: [] });

    render(<GameSelector selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('game-selector-empty')).toBeInTheDocument();
    });
  });

  it('calls onSelect when game clicked', async () => {
    const user = userEvent.setup();
    mockGetGames.mockResolvedValueOnce({ games: [baseGame] });

    render(<GameSelector selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('game-option-game-1')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('game-option-game-1'));
    expect(mockOnSelect).toHaveBeenCalledWith(baseGame);
  });

  it('highlights selected game', async () => {
    mockGetGames.mockResolvedValueOnce({ games: [baseGame] });

    render(<GameSelector selected={baseGame} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('game-option-game-1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('game-option-game-1')).toHaveClass('bg-blue-600/20');
  });

  it('toggles create game form', async () => {
    const user = userEvent.setup();
    mockGetGames.mockResolvedValueOnce({ games: [] });

    render(<GameSelector selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-create-form')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('toggle-create-form'));
    expect(screen.getByTestId('create-game-form')).toBeInTheDocument();

    await user.click(screen.getByTestId('toggle-create-form'));
    expect(screen.queryByTestId('create-game-form')).not.toBeInTheDocument();
  });

  it('creates and selects a new game', async () => {
    const user = userEvent.setup();
    const newGame: Game = { ...baseGame, id: 'game-new', homeTeam: 'Team A', awayTeam: 'Team B' };
    mockGetGames.mockResolvedValue({ games: [] });
    mockCreateGame.mockResolvedValueOnce({ success: true, game: { ...newGame, status: 'SCHEDULED' as const } });
    mockActivateGame.mockResolvedValueOnce({ success: true, game: newGame });

    render(<GameSelector selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-create-form')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('toggle-create-form'));
    await user.type(screen.getByTestId('create-game-home'), 'Team A');
    await user.type(screen.getByTestId('create-game-away'), 'Team B');
    await user.click(screen.getByTestId('create-game-submit'));

    await waitFor(() => {
      expect(mockCreateGame).toHaveBeenCalledWith('baseball', 'Team A', 'Team B');
    });
    expect(mockActivateGame).toHaveBeenCalled();
    expect(mockOnSelect).toHaveBeenCalledWith(newGame);
  });

  it('shows validation error for empty fields', async () => {
    const user = userEvent.setup();
    mockGetGames.mockResolvedValueOnce({ games: [] });

    render(<GameSelector selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-create-form')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('toggle-create-form'));
    await user.click(screen.getByTestId('create-game-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('create-game-error')).toHaveTextContent('All fields are required');
    });
  });

  it('shows error on create failure', async () => {
    const user = userEvent.setup();
    mockGetGames.mockResolvedValueOnce({ games: [] });
    mockCreateGame.mockRejectedValueOnce(new Error('Server error'));

    render(<GameSelector selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-create-form')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('toggle-create-form'));
    await user.type(screen.getByTestId('create-game-home'), 'A');
    await user.type(screen.getByTestId('create-game-away'), 'B');
    await user.click(screen.getByTestId('create-game-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('create-game-error')).toHaveTextContent('Server error');
    });
  });
});
