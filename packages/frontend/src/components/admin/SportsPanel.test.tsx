import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SportsPanel } from './SportsPanel';
import * as api from '@/lib/api';

jest.mock('@/lib/api');

const mockGetSports = api.getSports as jest.MockedFunction<typeof api.getSports>;
const mockGetSportCategories = api.getSportCategories as jest.MockedFunction<typeof api.getSportCategories>;

describe('SportsPanel', () => {
  beforeEach(() => {
    mockGetSports.mockReset();
    mockGetSportCategories.mockReset();
  });

  it('shows loading state', () => {
    mockGetSports.mockReturnValue(new Promise(() => {}));
    render(<SportsPanel />);

    expect(screen.getByTestId('sports-panel-loading')).toBeInTheDocument();
  });

  it('renders sports with categories', async () => {
    mockGetSports.mockResolvedValueOnce({
      sports: [
        { id: 'baseball', name: 'Baseball', description: null, createdAt: Date.now() },
      ],
    });
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
      ],
    });

    render(<SportsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('sports-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('sport-row-baseball')).toBeInTheDocument();
    expect(screen.getByText('Baseball')).toBeInTheDocument();
    expect(screen.getByText('1 categories')).toBeInTheDocument();
  });

  it('expands sport to show categories', async () => {
    const user = userEvent.setup();
    mockGetSports.mockResolvedValueOnce({
      sports: [
        { id: 'baseball', name: 'Baseball', description: null, createdAt: Date.now() },
      ],
    });
    mockGetSportCategories.mockResolvedValueOnce({
      sportId: 'baseball',
      categories: [
        { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: ['BALL', 'STRIKE'], description: null, createdAt: Date.now() },
      ],
    });

    render(<SportsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('sport-row-baseball')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('sport-row-baseball'));

    expect(screen.getByTestId('sport-categories-baseball')).toBeInTheDocument();
    expect(screen.getByTestId('category-row-pitching')).toBeInTheDocument();
    expect(screen.getByText('BALL')).toBeInTheDocument();
    expect(screen.getByText('STRIKE')).toBeInTheDocument();
  });
});
