import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarketSelector } from './MarketSelector';
import * as api from '@/lib/api';
import * as WebSocketProvider from '@/providers/WebSocketProvider';
import type { MarketData } from '@/lib/types';

jest.mock('@/lib/api');
jest.mock('@/providers/WebSocketProvider', () => ({
  useWebSocket: jest.fn(),
}));

const mockGetSportCategories = api.getSportCategories as jest.MockedFunction<
  typeof api.getSportCategories
>;
const mockUseWebSocket = WebSocketProvider.useWebSocket as jest.Mock;

const pitchingMarket: MarketData = {
  id: 'game-1-pitching-1',
  gameId: 'game-1',
  categoryId: 'pitching',
  status: 'OPEN',
  outcome: null,
  quantities: [5, 3],
  b: 100,
  qBall: 5,
  qStrike: 3,
};

describe('MarketSelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockGetSportCategories.mockReset();
    mockOnSelect.mockReset();
    mockUseWebSocket.mockReturnValue({
      subscribe: jest.fn().mockReturnValue(jest.fn()),
      isConnected: true,
    });
  });

  it('shows loading state', () => {
    mockGetSportCategories.mockReturnValue(new Promise(() => {}));

    render(
      <MarketSelector
        sportId="baseball"
        markets={[]}
        selected={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByTestId('market-selector-loading')).toBeInTheDocument();
  });

  it('renders category buttons', async () => {
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
        { id: 'batting', sportId: 'baseball', name: 'Batting', outcomes: ['HIT', 'OUT'], description: null, createdAt: Date.now() },
      ],
    });

    render(
      <MarketSelector
        sportId="baseball"
        markets={[]}
        selected="pitching"
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('market-selector')).toBeInTheDocument();
    });

    expect(screen.getByTestId('category-pitching')).toBeInTheDocument();
    expect(screen.getByTestId('category-batting')).toBeInTheDocument();
  });

  it('auto-selects first category when none selected', async () => {
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
      ],
    });

    render(
      <MarketSelector
        sportId="baseball"
        markets={[]}
        selected={null}
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith('pitching');
    });
  });

  it('calls onSelect when category clicked', async () => {
    const user = userEvent.setup();
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
        { id: 'batting', sportId: 'baseball', name: 'Batting', outcomes: ['HIT', 'OUT'], description: null, createdAt: Date.now() },
      ],
    });

    render(
      <MarketSelector
        sportId="baseball"
        markets={[]}
        selected="pitching"
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-batting')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('category-batting'));
    expect(mockOnSelect).toHaveBeenCalledWith('batting');
  });

  it('shows market status badge on category with market', async () => {
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
      ],
    });

    render(
      <MarketSelector
        sportId="baseball"
        markets={[pitchingMarket]}
        selected="pitching"
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-pitching-status')).toBeInTheDocument();
    });

    expect(screen.getByTestId('category-pitching-status')).toHaveTextContent('OPEN');
  });

  it('highlights selected category', async () => {
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
      ],
    });

    render(
      <MarketSelector
        sportId="baseball"
        markets={[]}
        selected="pitching"
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-pitching')).toBeInTheDocument();
    });

    expect(screen.getByTestId('category-pitching')).toHaveClass('bg-white');
  });

  it('shows empty state when no categories', async () => {
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'unknown',
      categories: [],
    });

    render(
      <MarketSelector
        sportId="unknown"
        markets={[]}
        selected={null}
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('market-selector-empty')).toBeInTheDocument();
    });
  });
});
