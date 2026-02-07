import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminTabs } from './AdminTabs';

describe('AdminTabs', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockReset();
  });

  it('renders all tabs', () => {
    render(<AdminTabs selected="sports" onSelect={mockOnSelect} />);

    expect(screen.getByTestId('admin-tab-sports')).toBeInTheDocument();
    expect(screen.getByTestId('admin-tab-games')).toBeInTheDocument();
    expect(screen.getByTestId('admin-tab-markets')).toBeInTheDocument();
    expect(screen.getByTestId('admin-tab-users')).toBeInTheDocument();
    expect(screen.getByTestId('admin-tab-leaderboard')).toBeInTheDocument();
  });

  it('highlights selected tab', () => {
    render(<AdminTabs selected="games" onSelect={mockOnSelect} />);

    expect(screen.getByTestId('admin-tab-games')).toHaveClass('bg-gray-700');
    expect(screen.getByTestId('admin-tab-sports')).not.toHaveClass('bg-gray-700');
  });

  it('calls onSelect when tab clicked', async () => {
    const user = userEvent.setup();
    render(<AdminTabs selected="sports" onSelect={mockOnSelect} />);

    await user.click(screen.getByTestId('admin-tab-markets'));
    expect(mockOnSelect).toHaveBeenCalledWith('markets');
  });
});
