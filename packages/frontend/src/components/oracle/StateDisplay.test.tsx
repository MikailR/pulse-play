import { render, screen, waitFor } from '@testing-library/react';
import { StateDisplay } from './StateDisplay';
import * as api from '@/lib/api';

jest.mock('@/lib/api');

const mockGetAdminState = api.getAdminState as jest.MockedFunction<
  typeof api.getAdminState
>;

describe('StateDisplay', () => {
  beforeEach(() => {
    mockGetAdminState.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows loading state initially', () => {
    mockGetAdminState.mockImplementation(() => new Promise(() => {}));

    render(<StateDisplay />);

    expect(screen.getByTestId('state-loading')).toBeInTheDocument();
  });

  it('displays system state', async () => {
    mockGetAdminState.mockResolvedValueOnce({
      market: { id: 'market-1', status: 'OPEN', outcome: null, qBall: 0, qStrike: 0, b: 100 },
      gameState: { active: true },
      positionCount: 5,
      connectionCount: 3,
    });

    render(<StateDisplay />);

    await waitFor(() => {
      expect(screen.getByTestId('state-display')).toBeInTheDocument();
    });

    expect(screen.getByTestId('state-game-active')).toHaveTextContent('Yes');
    expect(screen.getByTestId('state-market-id')).toHaveTextContent('market-1');
    expect(screen.getByTestId('state-market-status')).toHaveTextContent('OPEN');
    expect(screen.getByTestId('state-position-count')).toHaveTextContent('5');
    expect(screen.getByTestId('state-connection-count')).toHaveTextContent('3');
  });

  it('shows error on failure', async () => {
    mockGetAdminState.mockRejectedValueOnce(new Error('Network error'));

    render(<StateDisplay />);

    await waitFor(() => {
      expect(screen.getByTestId('state-error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('state-error')).toHaveTextContent('Network error');
  });
});
