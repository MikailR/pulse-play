import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GamesPanel } from './GamesPanel';
import * as api from '@/lib/api';
import type { Game, Team } from '@/lib/types';

jest.mock('@/lib/api');

const mockGetGames = api.getGames as jest.MockedFunction<typeof api.getGames>;
const mockGetSports = api.getSports as jest.MockedFunction<typeof api.getSports>;
const mockGetTeams = api.getTeams as jest.MockedFunction<typeof api.getTeams>;
const mockCreateGame = api.createGame as jest.MockedFunction<typeof api.createGame>;
const mockActivateGame = api.activateGame as jest.MockedFunction<typeof api.activateGame>;
const mockCompleteGame = api.completeGame as jest.MockedFunction<typeof api.completeGame>;

const teamNyy: Team = { id: 'nyy', sportId: 'baseball', name: 'Yankees', abbreviation: 'NYY', logoPath: null, createdAt: 1000 };
const teamBos: Team = { id: 'bos', sportId: 'baseball', name: 'Red Sox', abbreviation: 'BOS', logoPath: null, createdAt: 1000 };

const activeGame: Game = {
  id: 'game-1',
  sportId: 'baseball',
  homeTeamId: 'nyy',
  awayTeamId: 'bos',
  homeTeam: teamNyy,
  awayTeam: teamBos,
  status: 'ACTIVE',
  startedAt: Date.now(),
  completedAt: null,
  imagePath: null,
  metadata: null,
  createdAt: Date.now(),
};

const scheduledGame: Game = {
  ...activeGame,
  id: 'game-2',
  status: 'SCHEDULED',
  startedAt: null,
};

describe('GamesPanel', () => {
  beforeEach(() => {
    mockGetGames.mockReset();
    mockGetSports.mockReset();
    mockGetTeams.mockReset();
    mockCreateGame.mockReset();
    mockActivateGame.mockReset();
    mockCompleteGame.mockReset();
    mockGetSports.mockResolvedValue({
      sports: [{ id: 'baseball', name: 'Baseball', description: null, createdAt: Date.now() }],
    });
    mockGetTeams.mockResolvedValue({ teams: [teamNyy, teamBos] });
  });

  it('shows loading state', () => {
    mockGetGames.mockReturnValue(new Promise(() => {}));
    render(<GamesPanel />);

    expect(screen.getByTestId('games-loading')).toBeInTheDocument();
  });

  it('renders game list', async () => {
    mockGetGames.mockResolvedValueOnce({ games: [activeGame, scheduledGame] });

    render(<GamesPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('games-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('admin-game-game-1')).toBeInTheDocument();
    expect(screen.getByTestId('admin-game-game-2')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockGetGames.mockResolvedValueOnce({ games: [] });

    render(<GamesPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('games-empty')).toBeInTheDocument();
    });
  });

  it('creates a game', async () => {
    const user = userEvent.setup();
    mockGetGames.mockResolvedValue({ games: [] });
    mockCreateGame.mockResolvedValueOnce({ success: true, game: activeGame });

    render(<GamesPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-create')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('toggle-create'));

    // Wait for sports/teams to populate
    await waitFor(() => {
      expect(screen.getByTestId('create-home')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('create-home'), 'nyy');
    await user.selectOptions(screen.getByTestId('create-away'), 'bos');
    await user.click(screen.getByTestId('create-submit'));

    await waitFor(() => {
      expect(mockCreateGame).toHaveBeenCalledWith('baseball', 'nyy', 'bos');
    });
  });

  it('activates a scheduled game', async () => {
    const user = userEvent.setup();
    mockGetGames.mockResolvedValue({ games: [scheduledGame] });
    mockActivateGame.mockResolvedValueOnce({ success: true, game: activeGame });

    render(<GamesPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('activate-game-2')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('activate-game-2'));

    await waitFor(() => {
      expect(mockActivateGame).toHaveBeenCalledWith('game-2');
    });
  });

  it('completes an active game', async () => {
    const user = userEvent.setup();
    mockGetGames.mockResolvedValue({ games: [activeGame] });
    mockCompleteGame.mockResolvedValueOnce({
      success: true,
      game: { ...activeGame, status: 'COMPLETED' },
    });

    render(<GamesPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('complete-game-1')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('complete-game-1'));

    await waitFor(() => {
      expect(mockCompleteGame).toHaveBeenCalledWith('game-1');
    });
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    mockGetGames.mockResolvedValue({ games: [] });

    render(<GamesPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('filter-ACTIVE')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('filter-ACTIVE'));

    await waitFor(() => {
      expect(mockGetGames).toHaveBeenCalledWith({ status: 'ACTIVE' });
    });
  });
});
