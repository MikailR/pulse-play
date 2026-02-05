import { render, screen } from '@testing-library/react';
import { WalletStatus } from './WalletStatus';
import * as WagmiProvider from '@/providers/WagmiProvider';

// Mock the useWallet hook
jest.mock('@/providers/WagmiProvider', () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = WagmiProvider.useWallet as jest.Mock;

describe('WalletStatus', () => {
  it('shows not configured when wallet is not set up', () => {
    mockUseWallet.mockReturnValue({
      address: undefined,
      isConfigured: false,
    });

    render(<WalletStatus />);

    expect(screen.getByTestId('wallet-not-configured')).toHaveTextContent(
      'Wallet not configured'
    );
  });

  it('shows truncated address when wallet is configured', () => {
    mockUseWallet.mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isConfigured: true,
    });

    render(<WalletStatus />);

    expect(screen.getByTestId('wallet-status')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-address')).toHaveTextContent(
      '0x1234...5678'
    );
  });

  it('applies custom className', () => {
    mockUseWallet.mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isConfigured: true,
    });

    render(<WalletStatus className="custom-class" />);

    expect(screen.getByTestId('wallet-status')).toHaveClass('custom-class');
  });
});
