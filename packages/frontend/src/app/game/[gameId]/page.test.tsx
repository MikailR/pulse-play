import { render, screen, waitFor } from '@testing-library/react';
import GameDetailPage from './page';
import * as api from '@/lib/api';
import * as WebSocketProvider from '@/providers/WebSocketProvider';
import type { Game, MarketData } from '@/lib/types';

jest.mock('@/lib/api');
jest.mock('@/providers/WebSocketProvider', () => ({
  useWebSocket: jest.fn(),
}));
jest.mock('@/providers/SelectedMarketProvider', () => ({
  SelectedMarketProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="selected-market-provider">{children}</div>,
  useSelectedMarket: jest.fn().mockReturnValue({
    market: null,
    prices: [0.5, 0.5],
    outcomes: ['BALL', 'STRIKE'],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));
jest.mock('next/navigation', () => ({
  useParams: () => ({ gameId: 'game-1' }),
}));
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

const mockGetGame = api.getGame as jest.MockedFunction<typeof api.getGame>;
const mockGetSportCategories = api.getSportCategories as jest.MockedFunction<typeof api.getSportCategories>;
const mockUseWebSocket = WebSocketProvider.useWebSocket as jest.Mock;

const baseGame: Game = {
  id: 'game-1',
  sportId: 'baseball',
  homeTeamId: 'nyy',
  awayTeamId: 'bos',
  homeTeam: { id: 'nyy', sportId: 'baseball', name: 'Yankees', abbreviation: 'NYY', logoPath: null, createdAt: 1000 },
  awayTeam: { id: 'bos', sportId: 'baseball', name: 'Red Sox', abbreviation: 'BOS', logoPath: null, createdAt: 1000 },
  status: 'ACTIVE',
  startedAt: Date.now(),
  completedAt: null,
  imagePath: null,
  metadata: null,
  createdAt: Date.now(),
};

const openMarket: MarketData = {
  id: 'game-1-pitching-1',
  gameId: 'game-1',
  categoryId: 'pitching',
  status: 'OPEN',
  outcome: null,
  quantities: [0, 0],
  b: 100,
  qBall: 0,
  qStrike: 0,
};

describe('GameDetailPage', () => {
  beforeEach(() => {
    mockGetGame.mockReset();
    mockGetSportCategories.mockReset();
    mockUseWebSocket.mockReturnValue({
      subscribe: jest.fn().mockReturnValue(jest.fn()),
      isConnected: true,
    });
    // Default category fetch for MarketSelector
    mockGetSportCategories.mockResolvedValue({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
      ],
    });
  });

  it('shows loading state initially', () => {
    mockGetGame.mockReturnValue(new Promise(() => {}));
    render(<GameDetailPage />);

    expect(screen.getByTestId('game-detail-loading')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    mockGetGame.mockRejectedValueOnce(new Error('Not found'));

    render(<GameDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-detail-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('renders game header and market selector', async () => {
    mockGetGame.mockResolvedValueOnce({
      game: baseGame,
      markets: [],
    });

    render(<GameDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('game-header')).toBeInTheDocument();
    });

    expect(screen.getByTestId('game-header-matchup')).toHaveTextContent('Yankees vs Red Sox');
  });

  it('shows no-market message when category selected but no market exists', async () => {
    mockGetGame.mockResolvedValueOnce({
      game: baseGame,
      markets: [],
    });

    render(<GameDetailPage />);

    // Wait for game to load and auto-select pitching
    await waitFor(() => {
      expect(screen.getByTestId('no-market-message')).toBeInTheDocument();
    });

    expect(screen.getByText(/No market open for this category/)).toBeInTheDocument();
  });

  it('renders betting components when market exists', async () => {
    mockGetGame.mockResolvedValueOnce({
      game: baseGame,
      markets: [openMarket],
    });

    render(<GameDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('selected-market-provider')).toBeInTheDocument();
    });
  });
});
