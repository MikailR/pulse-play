import { render, screen } from '@testing-library/react';
import { WagmiProvider, useWallet } from './WagmiProvider';

// Test component to access wallet context
function WalletConsumer() {
  const { address, isConfigured } = useWallet();
  return (
    <div>
      <span data-testid="address">{address || 'no-address'}</span>
      <span data-testid="configured">{isConfigured ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('WagmiProvider', () => {
  it('renders children', () => {
    render(
      <WagmiProvider>
        <div data-testid="child">Hello</div>
      </WagmiProvider>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('provides wallet context with no address when PRIVATE_KEY not set', () => {
    // PRIVATE_KEY is not set in test environment
    render(
      <WagmiProvider>
        <WalletConsumer />
      </WagmiProvider>
    );

    expect(screen.getByTestId('address')).toHaveTextContent('no-address');
    expect(screen.getByTestId('configured')).toHaveTextContent('no');
  });

  it('useWallet returns default values outside provider', () => {
    // Render without provider to test default context
    const TestComponent = () => {
      const wallet = useWallet();
      return (
        <div>
          <span data-testid="default-address">
            {wallet.address || 'undefined'}
          </span>
        </div>
      );
    };

    render(<TestComponent />);
    expect(screen.getByTestId('default-address')).toHaveTextContent('undefined');
  });
});
