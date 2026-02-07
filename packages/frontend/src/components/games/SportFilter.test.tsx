import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SportFilter } from './SportFilter';
import * as api from '@/lib/api';

jest.mock('@/lib/api');

const mockGetSports = api.getSports as jest.MockedFunction<typeof api.getSports>;

describe('SportFilter', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockGetSports.mockReset();
    mockOnSelect.mockReset();
  });

  it('shows loading state initially', () => {
    mockGetSports.mockReturnValue(new Promise(() => {})); // never resolves
    render(<SportFilter selected={null} onSelect={mockOnSelect} />);

    expect(screen.getByTestId('sport-filter-loading')).toBeInTheDocument();
  });

  it('renders sport buttons after loading', async () => {
    mockGetSports.mockResolvedValueOnce({
      sports: [
        { id: 'baseball', name: 'Baseball', description: null, createdAt: Date.now() },
        { id: 'basketball', name: 'Basketball', description: null, createdAt: Date.now() },
      ],
    });

    render(<SportFilter selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('sport-filter')).toBeInTheDocument();
    });

    expect(screen.getByTestId('sport-filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('sport-filter-baseball')).toBeInTheDocument();
    expect(screen.getByTestId('sport-filter-basketball')).toBeInTheDocument();
  });

  it('highlights "All" when selected is null', async () => {
    mockGetSports.mockResolvedValueOnce({ sports: [] });

    render(<SportFilter selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('sport-filter')).toBeInTheDocument();
    });

    const allButton = screen.getByTestId('sport-filter-all');
    expect(allButton).toHaveClass('bg-white');
  });

  it('highlights selected sport button', async () => {
    mockGetSports.mockResolvedValueOnce({
      sports: [
        { id: 'baseball', name: 'Baseball', description: null, createdAt: Date.now() },
      ],
    });

    render(<SportFilter selected="baseball" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('sport-filter-baseball')).toBeInTheDocument();
    });

    expect(screen.getByTestId('sport-filter-baseball')).toHaveClass('bg-white');
    expect(screen.getByTestId('sport-filter-all')).not.toHaveClass('bg-white');
  });

  it('calls onSelect with sport id on click', async () => {
    const user = userEvent.setup();
    mockGetSports.mockResolvedValueOnce({
      sports: [
        { id: 'baseball', name: 'Baseball', description: null, createdAt: Date.now() },
      ],
    });

    render(<SportFilter selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('sport-filter-baseball')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('sport-filter-baseball'));
    expect(mockOnSelect).toHaveBeenCalledWith('baseball');
  });

  it('calls onSelect with null when "All" is clicked', async () => {
    const user = userEvent.setup();
    mockGetSports.mockResolvedValueOnce({ sports: [] });

    render(<SportFilter selected="baseball" onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('sport-filter')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('sport-filter-all'));
    expect(mockOnSelect).toHaveBeenCalledWith(null);
  });

  it('handles API error gracefully', async () => {
    mockGetSports.mockRejectedValueOnce(new Error('Network error'));

    render(<SportFilter selected={null} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('sport-filter')).toBeInTheDocument();
    });

    // Should render with just the "All" button
    expect(screen.getByTestId('sport-filter-all')).toBeInTheDocument();
  });
});
