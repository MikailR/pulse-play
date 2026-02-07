import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategorySelector } from './CategorySelector';
import * as api from '@/lib/api';
import type { MarketData } from '@/lib/types';

jest.mock('@/lib/api');

const mockGetSportCategories = api.getSportCategories as jest.MockedFunction<
  typeof api.getSportCategories
>;

const openMarket: MarketData = {
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

describe('CategorySelector', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockGetSportCategories.mockReset();
    mockOnSelect.mockReset();
  });

  it('shows loading state', () => {
    mockGetSportCategories.mockReturnValue(new Promise(() => {}));

    render(
      <CategorySelector
        sportId="baseball"
        markets={[]}
        selected={null}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByTestId('category-selector-loading')).toBeInTheDocument();
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
      <CategorySelector
        sportId="baseball"
        markets={[]}
        selected="pitching"
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-selector')).toBeInTheDocument();
    });

    expect(screen.getByTestId('oracle-category-pitching')).toBeInTheDocument();
    expect(screen.getByTestId('oracle-category-batting')).toBeInTheDocument();
  });

  it('auto-selects first category with outcomes', async () => {
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
      ],
    });

    render(
      <CategorySelector
        sportId="baseball"
        markets={[]}
        selected={null}
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith('pitching', ['BALL', 'STRIKE']);
    });
  });

  it('calls onSelect with outcomes when clicked', async () => {
    const user = userEvent.setup();
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
        { id: 'batting', sportId: 'baseball', name: 'Batting', outcomes: ['HIT', 'OUT'], description: null, createdAt: Date.now() },
      ],
    });

    render(
      <CategorySelector
        sportId="baseball"
        markets={[]}
        selected="pitching"
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('oracle-category-batting')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('oracle-category-batting'));
    expect(mockOnSelect).toHaveBeenCalledWith('batting', ['HIT', 'OUT']);
  });

  it('shows market status badge', async () => {
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
      ],
    });

    render(
      <CategorySelector
        sportId="baseball"
        markets={[openMarket]}
        selected="pitching"
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('oracle-category-pitching-status')).toBeInTheDocument();
    });

    expect(screen.getByTestId('oracle-category-pitching-status')).toHaveTextContent('OPEN');
  });

  it('highlights selected category', async () => {
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
      ],
    });

    render(
      <CategorySelector
        sportId="baseball"
        markets={[]}
        selected="pitching"
        onSelect={mockOnSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('oracle-category-pitching')).toBeInTheDocument();
    });

    expect(screen.getByTestId('oracle-category-pitching')).toHaveClass('bg-white');
  });
});
