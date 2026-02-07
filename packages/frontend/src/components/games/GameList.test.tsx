import { render, screen, waitFor } from '@testing-library/react';
import { GameList } from './GameList';
import * as api from '@/lib/api';
import * as WebSocketProvider from '@/providers/WebSocketProvider';
import type { Game, WsMessage } from '@/lib/types';

jest.mock('@/lib/api');
jest.mock('@/providers/WebSocketProvider', () => ({
  useWebSocket: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

const mockGetGames = api.getGames as jest.MockedFunction<typeof api.getGames>;
const mockUseWebSocket = WebSocketProvider.useWebSocket as jest.Mock;

const baseGame: Game = {
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

describe('GameList', () => {
  let subscribeFn: jest.Mock;
  let unsubscribe: jest.Mock;

  beforeEach(() => {
    unsubscribe = jest.fn();
    subscribeFn = jest.fn().mockReturnValue(unsubscribe);
    mockUseWebSocket.mockReturnValue({
      subscribe: subscribeFn,
      isConnected: true,
    });
    mockGetGames.mockReset();
  });

  it('shows loading state initially', () => {
    mockGetGames.mockReturnValue(new Promise(() => {}));
    render(<GameList />);

    expect(screen.getByTestId('game-list-loading')).toBeInTheDocument();
  });

  it('renders game cards after loading', async () => {
    mockGetGames.mockResolvedValueOnce({
      games: [baseGame, { ...baseGame, id: 'game-2', homeTeamId: 'lal', awayTeamId: 'gsw' }],
    });

    render(<GameList />);

    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('game-card-game-1')).toBeInTheDocument();
    expect(screen.getByTestId('game-card-game-2')).toBeInTheDocument();
  });

  it('shows empty state when no games', async () => {
    mockGetGames.mockResolvedValueOnce({ games: [] });

    render(<GameList />);

    await waitFor(() => {
      expect(screen.getByTestId('game-list-empty')).toBeInTheDocument();
    });

    expect(screen.getByText(/No active games/)).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    mockGetGames.mockRejectedValueOnce(new Error('Server error'));

    render(<GameList />);

    await waitFor(() => {
      expect(screen.getByTestId('game-list-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it('passes sportId filter to API', async () => {
    mockGetGames.mockResolvedValueOnce({ games: [] });

    render(<GameList sportId="basketball" />);

    await waitFor(() => {
      expect(mockGetGames).toHaveBeenCalledWith({ sportId: 'basketball' });
    });
  });

  it('passes no filter when sportId is null', async () => {
    mockGetGames.mockResolvedValueOnce({ games: [] });

    render(<GameList sportId={null} />);

    await waitFor(() => {
      expect(mockGetGames).toHaveBeenCalledWith({});
    });
  });

  it('refetches on GAME_STATE WebSocket message', async () => {
    mockGetGames.mockResolvedValue({ games: [baseGame] });

    render(<GameList />);

    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });

    // Get the WS handler
    const handler = subscribeFn.mock.calls[0][0] as (msg: WsMessage) => void;

    // Simulate GAME_STATE message
    handler({ type: 'GAME_STATE', active: true } as WsMessage);

    await waitFor(() => {
      // Should have been called twice: initial + refetch
      expect(mockGetGames).toHaveBeenCalledTimes(2);
    });
  });

  it('refetches on MARKET_STATUS WebSocket message', async () => {
    mockGetGames.mockResolvedValue({ games: [baseGame] });

    render(<GameList />);

    await waitFor(() => {
      expect(screen.getByTestId('game-list')).toBeInTheDocument();
    });

    const handler = subscribeFn.mock.calls[0][0] as (msg: WsMessage) => void;

    handler({ type: 'MARKET_STATUS', status: 'OPEN', marketId: 'game-1-pitching-1' } as WsMessage);

    await waitFor(() => {
      expect(mockGetGames).toHaveBeenCalledTimes(2);
    });
  });

  it('re-fetches when sportId changes', async () => {
    mockGetGames.mockResolvedValue({ games: [] });

    const { rerender } = render(<GameList sportId="baseball" />);

    await waitFor(() => {
      expect(mockGetGames).toHaveBeenCalledWith({ sportId: 'baseball' });
    });

    rerender(<GameList sportId="basketball" />);

    await waitFor(() => {
      expect(mockGetGames).toHaveBeenCalledWith({ sportId: 'basketball' });
    });
  });
});
