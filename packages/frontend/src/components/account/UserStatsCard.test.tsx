import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserStatsCard } from './UserStatsCard';

// Mock wallet hook
const mockUseWallet = jest.fn();
jest.mock('@/providers/WagmiProvider', () => ({
  useWallet: () => mockUseWallet(),
}));

// Mock API — define the shared class as a module-scoped function declaration (hoisted above jest.mock)
const mockGetUserStats = jest.fn();

// Shared ApiError class — used by both mock factory and test instances
const ApiErrorClass = (() => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  }
  return ApiError;
})();

jest.mock('@/lib/api', () => ({
  getUserStats: (...args: unknown[]) => mockGetUserStats(...args),
  get ApiError() { return ApiErrorClass; },
}));

const mockStats = {
  user: {
    address: '0xABC',
    totalBets: 10,
    totalWins: 6,
    totalLosses: 4,
    totalWagered: 50.0,
    totalPayout: 65.0,
    netPnl: 15.0,
    firstSeenAt: Date.now() - 86400000,
    lastActiveAt: Date.now(),
  },
};

describe('UserStatsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue({ address: '0xABC' });
  });

  it('shows connect-wallet message when no address', () => {
    mockUseWallet.mockReturnValue({ address: undefined });

    render(<UserStatsCard />);

    expect(screen.getByTestId('stats-not-connected')).toBeInTheDocument();
    expect(screen.getByText('Connect wallet to view stats')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    mockGetUserStats.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<UserStatsCard />);

    expect(screen.getByTestId('stats-loading')).toBeInTheDocument();
  });

  it('shows stats when API returns data', async () => {
    mockGetUserStats.mockResolvedValue(mockStats);

    render(<UserStatsCard />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    });

    expect(screen.getByTestId('stats-pnl')).toHaveTextContent('+$15.00');
    expect(screen.getByTestId('stats-total-bets')).toHaveTextContent('10');
    expect(screen.getByTestId('stats-wins')).toHaveTextContent('6');
    expect(screen.getByTestId('stats-losses')).toHaveTextContent('4');
    expect(screen.getByTestId('stats-winrate')).toHaveTextContent('60.0% win rate');
  });

  it('shows "No activity yet" on 404 error', async () => {
    mockGetUserStats.mockRejectedValue(new ApiErrorClass(404, 'Not found'));

    render(<UserStatsCard />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-empty')).toBeInTheDocument();
    });

    expect(screen.getByText('No activity yet. Place your first bet!')).toBeInTheDocument();
  });

  it('shows error message on non-404 API error', async () => {
    mockGetUserStats.mockRejectedValue(new Error('Internal server error'));

    render(<UserStatsCard />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('stats-error-message')).toHaveTextContent('Internal server error');
  });

  it('retries on error when retry button is clicked', async () => {
    mockGetUserStats.mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    render(<UserStatsCard />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-error')).toBeInTheDocument();
    });

    // Now mock success on retry
    mockGetUserStats.mockResolvedValue(mockStats);
    await user.click(screen.getByTestId('stats-retry'));

    await waitFor(() => {
      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    });
  });

  it('re-fetches when refreshKey changes', async () => {
    mockGetUserStats.mockRejectedValueOnce(new ApiErrorClass(404, 'Not found'));

    const { rerender } = render(<UserStatsCard refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-empty')).toBeInTheDocument();
    });

    // Simulate new activity — refreshKey changes
    mockGetUserStats.mockResolvedValue(mockStats);
    rerender(<UserStatsCard refreshKey={1} />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-card')).toBeInTheDocument();
    });

    expect(mockGetUserStats).toHaveBeenCalledTimes(2);
  });

  it('shows refresh button on empty state', async () => {
    mockGetUserStats.mockRejectedValue(new ApiErrorClass(404, 'Not found'));

    render(<UserStatsCard />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-refresh')).toBeInTheDocument();
    });
  });
});
