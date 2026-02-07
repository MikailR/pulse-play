import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MMFeeCard } from './MMFeeCard';
import * as api from '@/lib/api';

jest.mock('@/lib/api');

const mockGetAdminConfig = api.getAdminConfig as jest.MockedFunction<typeof api.getAdminConfig>;
const mockUpdateAdminConfig = api.updateAdminConfig as jest.MockedFunction<typeof api.updateAdminConfig>;

describe('MMFeeCard', () => {
  beforeEach(() => {
    mockGetAdminConfig.mockReset();
    mockUpdateAdminConfig.mockReset();
    mockGetAdminConfig.mockResolvedValue({ transactionFeePercent: 1 });
  });

  it('renders and fetches current fee on mount', async () => {
    render(<MMFeeCard />);

    await waitFor(() => {
      expect(screen.getByTestId('fee-current')).toHaveTextContent('1%');
    });
    expect(mockGetAdminConfig).toHaveBeenCalledTimes(1);
  });

  it('renders preset fee buttons', async () => {
    render(<MMFeeCard />);

    expect(screen.getByTestId('fee-preset-0')).toHaveTextContent('0%');
    expect(screen.getByTestId('fee-preset-0.5')).toHaveTextContent('0.5%');
    expect(screen.getByTestId('fee-preset-1')).toHaveTextContent('1%');
    expect(screen.getByTestId('fee-preset-2')).toHaveTextContent('2%');
  });

  it('selecting a preset updates selection', async () => {
    const user = userEvent.setup();
    render(<MMFeeCard />);

    await waitFor(() => {
      expect(screen.getByTestId('fee-current')).toHaveTextContent('1%');
    });

    await user.click(screen.getByTestId('fee-preset-2'));
    // Save button should be enabled since 2 !== 1 (current)
    expect(screen.getByTestId('fee-submit')).not.toBeDisabled();
  });

  it('saves fee on submit', async () => {
    const user = userEvent.setup();
    mockUpdateAdminConfig.mockResolvedValueOnce({ success: true, transactionFeePercent: 2 });

    render(<MMFeeCard />);

    await waitFor(() => {
      expect(screen.getByTestId('fee-current')).toHaveTextContent('1%');
    });

    await user.click(screen.getByTestId('fee-preset-2'));
    await user.click(screen.getByTestId('fee-submit'));

    await waitFor(() => {
      expect(mockUpdateAdminConfig).toHaveBeenCalledWith(2);
    });

    await waitFor(() => {
      expect(screen.getByTestId('fee-success')).toHaveTextContent('Fee updated to 2%');
    });
  });

  it('shows error on save failure', async () => {
    const user = userEvent.setup();
    mockUpdateAdminConfig.mockRejectedValueOnce(new Error('Server error'));

    render(<MMFeeCard />);

    await waitFor(() => {
      expect(screen.getByTestId('fee-current')).toHaveTextContent('1%');
    });

    await user.click(screen.getByTestId('fee-preset-0'));
    await user.click(screen.getByTestId('fee-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('fee-error')).toHaveTextContent('Server error');
    });
  });

  it('custom input accepts values', async () => {
    const user = userEvent.setup();
    render(<MMFeeCard />);

    await waitFor(() => {
      expect(screen.getByTestId('fee-current')).toHaveTextContent('1%');
    });

    const input = screen.getByTestId('fee-custom-input');
    await user.clear(input);
    await user.type(input, '1.5');

    // Submit should be enabled (1.5 !== 1)
    expect(screen.getByTestId('fee-submit')).not.toBeDisabled();
  });

  it('submit disabled when value unchanged', async () => {
    render(<MMFeeCard />);

    await waitFor(() => {
      expect(screen.getByTestId('fee-current')).toHaveTextContent('1%');
    });

    // Default selected is 1 (same as current) — button should be disabled
    expect(screen.getByTestId('fee-submit')).toBeDisabled();
  });
});
