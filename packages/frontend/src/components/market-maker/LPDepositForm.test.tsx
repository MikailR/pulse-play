import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LPDepositForm } from './LPDepositForm';
import * as api from '@/lib/api';

jest.mock('@/lib/api', () => ({
  depositLP: jest.fn(),
}));

const mockDepositLP = api.depositLP as jest.MockedFunction<typeof api.depositLP>;

describe('LPDepositForm', () => {
  beforeEach(() => {
    mockDepositLP.mockReset();
  });

  it('shows "Connect wallet" when address is null', () => {
    render(<LPDepositForm address={null} />);

    expect(screen.getByTestId('lp-deposit-connect')).toHaveTextContent('Connect wallet');
  });

  it('preset amount buttons set the input value', async () => {
    const user = userEvent.setup();
    render(<LPDepositForm address="0x1234" />);

    await user.click(screen.getByTestId('deposit-preset-50'));

    const input = screen.getByTestId('deposit-amount-input') as HTMLInputElement;
    expect(input.value).toBe('50');
    expect(screen.getByTestId('deposit-submit')).toHaveTextContent('Deposit $50');
  });

  it('successful deposit shows success message and calls onDeposit', async () => {
    const user = userEvent.setup();
    const onDeposit = jest.fn();
    mockDepositLP.mockResolvedValueOnce({
      success: true,
      shares: 10,
      sharePrice: 10,
      poolValueAfter: 1100,
    });

    render(<LPDepositForm address="0x1234" onDeposit={onDeposit} />);

    await user.click(screen.getByTestId('deposit-preset-100'));
    await user.click(screen.getByTestId('deposit-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('deposit-success')).toBeInTheDocument();
    });

    expect(screen.getByTestId('deposit-success')).toHaveTextContent('Deposited $100');
    expect(mockDepositLP).toHaveBeenCalledWith('0x1234', 100);
    expect(onDeposit).toHaveBeenCalledTimes(1);
  });

  it('failed deposit shows error message', async () => {
    const user = userEvent.setup();
    mockDepositLP.mockRejectedValueOnce(new Error('Insufficient balance'));

    render(<LPDepositForm address="0x1234" />);

    await user.click(screen.getByTestId('deposit-preset-100'));
    await user.click(screen.getByTestId('deposit-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('deposit-error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('deposit-error')).toHaveTextContent('Insufficient balance');
  });

  it('submit button disabled while submitting', async () => {
    const user = userEvent.setup();
    mockDepositLP.mockReturnValue(new Promise(() => {})); // never resolves

    render(<LPDepositForm address="0x1234" />);

    await user.click(screen.getByTestId('deposit-preset-50'));
    await user.click(screen.getByTestId('deposit-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('deposit-submit')).toHaveTextContent('Depositing...');
    });

    expect(screen.getByTestId('deposit-submit')).toBeDisabled();
  });

  it('validates amount is positive — submit disabled with no input', () => {
    render(<LPDepositForm address="0x1234" />);

    expect(screen.getByTestId('deposit-submit')).toBeDisabled();
  });

  it('validates amount is positive — submit disabled for zero', async () => {
    const user = userEvent.setup();
    render(<LPDepositForm address="0x1234" />);

    const input = screen.getByTestId('deposit-amount-input');
    await user.clear(input);
    await user.type(input, '0');

    expect(screen.getByTestId('deposit-submit')).toBeDisabled();
  });
});
