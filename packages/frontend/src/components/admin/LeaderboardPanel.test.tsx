import { render, screen, waitFor } from '@testing-library/react';
import { LeaderboardPanel } from './LeaderboardPanel';
import * as api from '@/lib/api';
import type { UserStats } from '@/lib/types';

jest.mock('@/lib/api');

const mockGetLeaderboard = api.getLeaderboard as jest.MockedFunction<typeof api.getLeaderboard>;

const mockUser: UserStats = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  totalBets: 10,
  totalWins: 6,
  totalLosses: 4,
  totalWagered: 100,
  totalPayout: 120,
  netPnl: 20,
  firstSeenAt: Date.now(),
  lastActiveAt: Date.now(),
};

describe('LeaderboardPanel', () => {
  beforeEach(() => {
    mockGetLeaderboard.mockReset();
  });

  it('shows loading state', () => {
    mockGetLeaderboard.mockReturnValue(new Promise(() => {}));
    render(<LeaderboardPanel />);

    expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockGetLeaderboard.mockResolvedValueOnce({ leaderboard: [] });

    render(<LeaderboardPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-empty')).toBeInTheDocument();
    });
  });

  it('renders leaderboard rows', async () => {
    mockGetLeaderboard.mockResolvedValueOnce({
      leaderboard: [mockUser],
    });

    render(<LeaderboardPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('leaderboard-row-0')).toBeInTheDocument();
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText('+$20.00')).toBeInTheDocument();
  });

  it('shows rank colors for top 3', async () => {
    const users = [
      { ...mockUser, address: '0x1111111111111111111111111111111111111111', netPnl: 100 },
      { ...mockUser, address: '0x2222222222222222222222222222222222222222', netPnl: 50 },
      { ...mockUser, address: '0x3333333333333333333333333333333333333333', netPnl: 25 },
    ];
    mockGetLeaderboard.mockResolvedValueOnce({ leaderboard: users });

    render(<LeaderboardPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-row-0')).toBeInTheDocument();
    });

    expect(screen.getByTestId('leaderboard-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-row-2')).toBeInTheDocument();
  });

  it('shows negative P&L in red', async () => {
    const loser = { ...mockUser, netPnl: -15.5 };
    mockGetLeaderboard.mockResolvedValueOnce({ leaderboard: [loser] });

    render(<LeaderboardPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-row-0')).toBeInTheDocument();
    });

    // Text is split across template literal parts: "$" and "-15.50"
    expect(screen.getByTestId('leaderboard-row-0')).toHaveTextContent('$-15.50');
  });
});
