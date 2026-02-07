import React, { createContext, useContext } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClearnodeProvider, useClearnode } from './ClearnodeProvider';
import type { WalletMode } from '@/lib/config';

// Mock the clearnode lib
const mockOpenClearnodeWs = jest.fn();
const mockAuthenticateBrowser = jest.fn();
const mockSendAndWaitBrowser = jest.fn();

jest.mock('@/lib/clearnode', () => ({
  openClearnodeWs: (...args: unknown[]) => mockOpenClearnodeWs(...args),
  authenticateBrowser: (...args: unknown[]) => mockAuthenticateBrowser(...args),
  sendAndWaitBrowser: (...args: unknown[]) => mockSendAndWaitBrowser(...args),
}));

// Mock the clearnode methods module
const mockCreateAppSession = jest.fn().mockResolvedValue({ appSessionId: '0xSESSION1', version: 1, status: 'open' });
const mockCloseAppSession = jest.fn().mockResolvedValue(undefined);
const mockSubmitAppState = jest.fn().mockResolvedValue({ version: 2 });
const mockTransfer = jest.fn().mockResolvedValue(undefined);
const mockGetAppSessions = jest.fn().mockResolvedValue([]);
const mockGetConfig = jest.fn().mockResolvedValue({ brokerAddress: '0xBROKER', networks: [] });

jest.mock('@/lib/clearnode/methods', () => ({
  createAppSession: (...args: unknown[]) => mockCreateAppSession(...args),
  closeAppSession: (...args: unknown[]) => mockCloseAppSession(...args),
  submitAppState: (...args: unknown[]) => mockSubmitAppState(...args),
  transfer: (...args: unknown[]) => mockTransfer(...args),
  getAppSessions: (...args: unknown[]) => mockGetAppSessions(...args),
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
}));

// Mock config
jest.mock('@/lib/config', () => ({
  CLEARNODE_URL: 'wss://test-clearnode.com/ws',
  PRIVATE_KEY: '0x' + 'ab'.repeat(32),
  WALLET_MODE: 'private-key',
  HUB_REST_URL: 'http://localhost:3001',
  HUB_WS_URL: 'ws://localhost:3001/ws',
  CHAIN_ID: 11155111,
}));

// Instead of using the real WagmiProvider (which has complex internal logic),
// we create a minimal WalletContext wrapper that lets us control the wallet state directly.
// This mirrors the interface from WagmiProvider.
interface WalletContextValue {
  address: `0x${string}` | undefined;
  isConfigured: boolean;
  mode: WalletMode;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  address: undefined,
  isConfigured: false,
  mode: 'private-key',
  isConnecting: false,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
});

// ClearnodeProvider uses useWallet() from WagmiProvider. We need to mock it.
jest.mock('./WagmiProvider', () => ({
  useWallet: () => useContext(WalletContext),
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function TestWalletProvider({ children, value }: { children: React.ReactNode; value: Partial<WalletContextValue> }) {
  const defaultValue: WalletContextValue = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    isConfigured: true,
    mode: 'private-key',
    isConnecting: false,
    isConnected: true,
    connect: () => {},
    disconnect: () => {},
    ...value,
  };
  return (
    <WalletContext.Provider value={defaultValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Consumer component for testing
function ClearnodeConsumer() {
  const { status, error, isSessionValid, expiresAt, signer, balance, ws, allowanceAmount } = useClearnode();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="error">{error || 'none'}</span>
      <span data-testid="session-valid">{isSessionValid ? 'yes' : 'no'}</span>
      <span data-testid="expires-at">{expiresAt}</span>
      <span data-testid="has-signer">{signer ? 'yes' : 'no'}</span>
      <span data-testid="balance">{balance || 'none'}</span>
      <span data-testid="has-ws">{ws ? 'yes' : 'no'}</span>
      <span data-testid="allowance-amount">{allowanceAmount}</span>
    </div>
  );
}

function ClearnodeConsumerWithActions() {
  const { status, error, balance, allowanceAmount, setAllowanceAmount, reconnect, disconnect, refreshBalance } = useClearnode();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="error">{error || 'none'}</span>
      <span data-testid="balance">{balance || 'none'}</span>
      <span data-testid="allowance-amount">{allowanceAmount}</span>
      <button data-testid="reconnect" onClick={() => reconnect()}>Reconnect</button>
      <button data-testid="disconnect" onClick={() => disconnect()}>Disconnect</button>
      <button data-testid="set-allowance-500" onClick={() => setAllowanceAmount(500)}>Set 500</button>
      <button data-testid="refresh-balance" onClick={() => refreshBalance()}>Refresh</button>
    </div>
  );
}

// Consumer for testing RPC method delegation
function ClearnodeMethodConsumer() {
  const ctx = useClearnode();
  const [result, setResult] = React.useState<string>('none');

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'unknown');

  return (
    <div>
      <span data-testid="status">{ctx.status}</span>
      <span data-testid="method-result">{result}</span>
      <button
        data-testid="call-getConfig"
        onClick={async () => {
          try {
            const cfg = await ctx.getConfig();
            setResult(cfg.brokerAddress);
          } catch (e: unknown) {
            setResult(`error:${errMsg(e)}`);
          }
        }}
      >getConfig</button>
      <button
        data-testid="call-getAppSessions"
        onClick={async () => {
          try {
            const sessions = await ctx.getAppSessions('open');
            setResult(`sessions:${sessions.length}`);
          } catch (e: unknown) {
            setResult(`error:${errMsg(e)}`);
          }
        }}
      >getAppSessions</button>
      <button
        data-testid="call-createAppSession"
        onClick={async () => {
          try {
            const r = await ctx.createAppSession({
              counterparty: '0xMM01' as `0x${string}`,
              allocations: [{ asset: 'ytest.usd', amount: '500000', participant: '0xUser' as `0x${string}` }],
            });
            setResult(`created:${r.appSessionId}`);
          } catch (e: unknown) {
            setResult(`error:${errMsg(e)}`);
          }
        }}
      >createAppSession</button>
      <button
        data-testid="call-transfer"
        onClick={async () => {
          try {
            await ctx.transfer({ destination: '0xDest' as `0x${string}`, asset: 'ytest.usd', amount: '100' });
            setResult('transferred');
          } catch (e: unknown) {
            setResult(`error:${errMsg(e)}`);
          }
        }}
      >transfer</button>
      <button
        data-testid="call-submitAppState"
        onClick={async () => {
          try {
            const r = await ctx.submitAppState({
              appSessionId: '0xSESSION' as `0x${string}`,
              intent: 'operate',
              version: 2,
              allocations: [{ asset: 'ytest.usd', amount: '500000', participant: '0xUser' as `0x${string}` }],
            });
            setResult(`version:${r.version}`);
          } catch (e: unknown) {
            setResult(`error:${errMsg(e)}`);
          }
        }}
      >submitAppState</button>
      <button
        data-testid="call-closeAppSession"
        onClick={async () => {
          try {
            await ctx.closeAppSession({
              appSessionId: '0xSESSION' as `0x${string}`,
              allocations: [{ asset: 'ytest.usd', amount: '1000000', participant: '0xUser' as `0x${string}` }],
            });
            setResult('closed');
          } catch (e: unknown) {
            setResult(`error:${errMsg(e)}`);
          }
        }}
      >closeAppSession</button>
    </div>
  );
}

function renderWithProviders(
  ui: React.ReactElement,
  walletOverrides: Partial<WalletContextValue> = {},
) {
  return render(
    <TestWalletProvider value={walletOverrides}>
      <ClearnodeProvider>
        {ui}
      </ClearnodeProvider>
    </TestWalletProvider>
  );
}

// Create a mock WebSocket object
function createMockWs() {
  return {
    readyState: WebSocket.OPEN,
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    send: jest.fn(),
  };
}

describe('ClearnodeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks for successful auth flow
    const mockWs = createMockWs();
    mockOpenClearnodeWs.mockResolvedValue(mockWs);
    mockAuthenticateBrowser.mockResolvedValue({
      signer: 'mock-signer',
      sessionAddress: '0xSESSION',
      expiresAt: Date.now() + 3600_000,
    });
    // sendAndWaitBrowser returns raw JSON; parseGetLedgerBalancesResponse from the
    // nitrolite mock returns { params: { ledgerBalances: [{ asset: 'ytest.usd', amount: '1000000' }] } }
    mockSendAndWaitBrowser.mockResolvedValue('{"res":[1,"get_ledger_balances",{}]}');

    // Re-establish method mocks (cleared by clearAllMocks)
    mockCreateAppSession.mockResolvedValue({ appSessionId: '0xSESSION1', version: 1, status: 'open' });
    mockCloseAppSession.mockResolvedValue(undefined);
    mockSubmitAppState.mockResolvedValue({ version: 2 });
    mockTransfer.mockResolvedValue(undefined);
    mockGetAppSessions.mockResolvedValue([]);
    mockGetConfig.mockResolvedValue({ brokerAddress: '0xBROKER', networks: [] });
  });

  it('renders children while disconnected (no wallet)', () => {
    renderWithProviders(<ClearnodeConsumer />, {
      address: undefined,
      isConnected: false,
    });

    expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('has-signer')).toHaveTextContent('no');
    expect(mockOpenClearnodeWs).not.toHaveBeenCalled();
  });

  it('auto-authenticates when wallet is connected', async () => {
    renderWithProviders(<ClearnodeConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    expect(mockOpenClearnodeWs).toHaveBeenCalledWith('wss://test-clearnode.com/ws');
    expect(mockAuthenticateBrowser).toHaveBeenCalled();
    expect(screen.getByTestId('has-signer')).toHaveTextContent('yes');
    expect(screen.getByTestId('session-valid')).toHaveTextContent('yes');
  });

  it('fetches balance after successful auth', async () => {
    renderWithProviders(<ClearnodeConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // parseGetLedgerBalancesResponse (nitrolite mock) returns amount: '1000000'
    await waitFor(() => {
      expect(screen.getByTestId('balance')).toHaveTextContent('1000000');
    });
  });

  it('shows error status when WebSocket connection fails', async () => {
    mockOpenClearnodeWs.mockRejectedValue(new Error('WebSocket connection failed'));

    renderWithProviders(<ClearnodeConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('WebSocket connection failed');
    expect(screen.getByTestId('has-signer')).toHaveTextContent('no');
  });

  it('shows error status when authentication fails', async () => {
    mockAuthenticateBrowser.mockRejectedValue(new Error('Auth verify failed'));

    renderWithProviders(<ClearnodeConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Auth verify failed');
  });

  it('exposes ws reference when connected', async () => {
    renderWithProviders(<ClearnodeConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('has-ws')).toHaveTextContent('yes');
    });
  });

  it('disconnect cleans up state', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeConsumerWithActions />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    await user.click(screen.getByTestId('disconnect'));

    expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('balance')).toHaveTextContent('none');
  });

  it('reconnect re-authenticates', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeConsumerWithActions />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Reset and set up for second connection
    const mockWs2 = createMockWs();
    mockOpenClearnodeWs.mockResolvedValue(mockWs2);
    mockAuthenticateBrowser.mockResolvedValue({
      signer: 'mock-signer-2',
      sessionAddress: '0xSESSION2',
      expiresAt: Date.now() + 3600_000,
    });

    await user.click(screen.getByTestId('reconnect'));

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Should have been called twice (initial + reconnect)
    expect(mockOpenClearnodeWs).toHaveBeenCalledTimes(2);
  });

  it('cleans up WebSocket on unmount', async () => {
    const mockWs = createMockWs();
    mockOpenClearnodeWs.mockResolvedValue(mockWs);

    const { unmount } = renderWithProviders(<ClearnodeConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    unmount();

    expect(mockWs.close).toHaveBeenCalled();
  });

  it('balance stays null when balance fetch fails', async () => {
    // Auth succeeds but balance fetch throws
    mockSendAndWaitBrowser.mockRejectedValue(new Error('Balance timeout'));

    renderWithProviders(<ClearnodeConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Balance should remain null (non-fatal error)
    expect(screen.getByTestId('balance')).toHaveTextContent('none');
  });

  it('exposes expiresAt when authenticated', async () => {
    const futureTime = Date.now() + 3600_000;
    mockAuthenticateBrowser.mockResolvedValue({
      signer: 'mock-signer',
      sessionAddress: '0xSESSION',
      expiresAt: futureTime,
    });

    renderWithProviders(<ClearnodeConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    expect(Number(screen.getByTestId('expires-at').textContent)).toBe(futureTime);
  });

  it('allowanceAmount defaults to 1000', () => {
    renderWithProviders(<ClearnodeConsumer />, {
      address: undefined,
      isConnected: false,
    });

    expect(screen.getByTestId('allowance-amount')).toHaveTextContent('1000');
  });

  it('setAllowanceAmount updates the allowance', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeConsumerWithActions />, {
      address: undefined,
      isConnected: false,
    });

    expect(screen.getByTestId('allowance-amount')).toHaveTextContent('1000');

    await user.click(screen.getByTestId('set-allowance-500'));

    expect(screen.getByTestId('allowance-amount')).toHaveTextContent('500');
  });

  it('passes allowanceAmount to authenticateBrowser', async () => {
    const user = userEvent.setup();

    // Start disconnected so we can set allowance first
    const { rerender } = render(
      <TestWalletProvider value={{ address: undefined, isConnected: false }}>
        <ClearnodeProvider>
          <ClearnodeConsumerWithActions />
        </ClearnodeProvider>
      </TestWalletProvider>
    );

    // Set allowance to 500
    await user.click(screen.getByTestId('set-allowance-500'));
    expect(screen.getByTestId('allowance-amount')).toHaveTextContent('500');

    // Now connect wallet — this triggers authenticate with the updated allowance
    rerender(
      <TestWalletProvider value={{ isConnected: true }}>
        <ClearnodeProvider>
          <ClearnodeConsumerWithActions />
        </ClearnodeProvider>
      </TestWalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Verify authenticateBrowser was called with custom allowance
    expect(mockAuthenticateBrowser).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        allowances: [{ asset: 'ytest.usd', amount: '500000000' }],
      }),
    );
  });

  it('changing allowanceAmount does not trigger re-authentication', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeConsumerWithActions />);

    // Wait for initial auth to complete
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    const initialCallCount = mockAuthenticateBrowser.mock.calls.length;

    // Change allowance — should NOT trigger re-auth
    await user.click(screen.getByTestId('set-allowance-500'));
    expect(screen.getByTestId('allowance-amount')).toHaveTextContent('500');

    // Wait a tick to ensure no async re-auth was triggered
    await new Promise(r => setTimeout(r, 50));

    // authenticate should not have been called again
    expect(mockAuthenticateBrowser.mock.calls.length).toBe(initialCallCount);
    expect(screen.getByTestId('status')).toHaveTextContent('connected');
  });

  // ── RPC method delegation tests ──

  it('getConfig delegates to methods module when connected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    await user.click(screen.getByTestId('call-getConfig'));

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).toHaveTextContent('0xBROKER');
    });
    expect(mockGetConfig).toHaveBeenCalled();
  });

  it('getAppSessions delegates with status filter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    await user.click(screen.getByTestId('call-getAppSessions'));

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).toHaveTextContent('sessions:0');
    });
    expect(mockGetAppSessions).toHaveBeenCalledWith(
      expect.anything(), // ws
      expect.anything(), // signer
      expect.any(String), // address
      'open', // status filter
    );
  });

  it('createAppSession delegates and returns result', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    await user.click(screen.getByTestId('call-createAppSession'));

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).toHaveTextContent('created:0xSESSION1');
    });
    expect(mockCreateAppSession).toHaveBeenCalled();
  });

  it('transfer delegates to methods module', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    await user.click(screen.getByTestId('call-transfer'));

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).toHaveTextContent('transferred');
    });
    expect(mockTransfer).toHaveBeenCalled();
  });

  it('submitAppState delegates and returns version', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    await user.click(screen.getByTestId('call-submitAppState'));

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).toHaveTextContent('version:2');
    });
    expect(mockSubmitAppState).toHaveBeenCalled();
  });

  it('closeAppSession delegates to methods module', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    await user.click(screen.getByTestId('call-closeAppSession'));

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).toHaveTextContent('closed');
    });
    expect(mockCloseAppSession).toHaveBeenCalled();
  });

  // ── Auto-reconnection tests ──

  it('reconnects with full auth when WS drops', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Simulate dead WS — set readyState to CLOSED
    const initialWs = mockOpenClearnodeWs.mock.results[0].value;
    (await initialWs).readyState = WebSocket.CLOSED;

    // Set up a fresh WS + auth for reconnect
    const freshWs = createMockWs();
    mockOpenClearnodeWs.mockResolvedValueOnce(freshWs);
    mockAuthenticateBrowser.mockResolvedValueOnce({
      signer: 'mock-signer-reconnected',
      sessionAddress: '0xSESSION_RECONNECTED',
      expiresAt: Date.now() + 3600_000,
    });

    // Call a method — should trigger full re-auth
    await user.click(screen.getByTestId('call-getConfig'));

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).toHaveTextContent('0xBROKER');
    });

    // Should have opened a new WS AND re-authenticated (initial + reconnect)
    expect(mockOpenClearnodeWs).toHaveBeenCalledTimes(2);
    expect(mockAuthenticateBrowser).toHaveBeenCalledTimes(2);
  });

  it('full re-auth when signer has expired', async () => {
    // Set up auth to return a signer that expires immediately
    mockAuthenticateBrowser.mockResolvedValueOnce({
      signer: 'mock-signer',
      sessionAddress: '0xSESSION',
      expiresAt: Date.now() - 1000, // Already expired
    });

    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Simulate dead WS
    const initialWs = await mockOpenClearnodeWs.mock.results[0].value;
    initialWs.readyState = WebSocket.CLOSED;

    // Set up fresh WS + auth for full re-auth
    const freshWs = createMockWs();
    mockOpenClearnodeWs.mockResolvedValueOnce(freshWs);
    mockAuthenticateBrowser.mockResolvedValueOnce({
      signer: 'mock-signer-2',
      sessionAddress: '0xSESSION2',
      expiresAt: Date.now() + 3600_000,
    });

    // Call a method — should trigger full re-auth since signer expired
    await user.click(screen.getByTestId('call-getConfig'));

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).toHaveTextContent('0xBROKER');
    });

    // Should have called authenticateBrowser for full re-auth
    expect(mockAuthenticateBrowser).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent reconnection attempts', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Simulate dead WS
    const initialWs = await mockOpenClearnodeWs.mock.results[0].value;
    initialWs.readyState = WebSocket.CLOSED;

    // Set up slow reconnect to ensure both calls overlap — openClearnodeWs hangs
    let resolveWs: (ws: ReturnType<typeof createMockWs>) => void;
    const wsPromise = new Promise<ReturnType<typeof createMockWs>>((r) => { resolveWs = r; });
    mockOpenClearnodeWs.mockReturnValueOnce(wsPromise);

    // Set up auth for the reconnect
    mockAuthenticateBrowser.mockResolvedValueOnce({
      signer: 'mock-signer-dedup',
      sessionAddress: '0xSESSION_DEDUP',
      expiresAt: Date.now() + 3600_000,
    });

    // Fire two methods concurrently against the dead WS
    await user.click(screen.getByTestId('call-getConfig'));
    await user.click(screen.getByTestId('call-getAppSessions'));

    // Resolve the WS — both methods should share this one reconnect (full auth)
    const freshWs = createMockWs();
    resolveWs!(freshWs);

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).not.toHaveTextContent('none');
    });

    // Should have only opened one new WS (not two) and only one re-auth
    expect(mockOpenClearnodeWs).toHaveBeenCalledTimes(2); // initial + 1 reconnect
    expect(mockAuthenticateBrowser).toHaveBeenCalledTimes(2); // initial + 1 reconnect
  });

  it('status updates to disconnected when WS close event fires', async () => {
    const mockWs = createMockWs();
    mockOpenClearnodeWs.mockResolvedValue(mockWs);

    // Capture addEventListener calls to invoke the handler later
    const handlers: Record<string, (() => void)[]> = {};
    mockWs.addEventListener.mockImplementation((event: string, handler: () => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    });

    renderWithProviders(<ClearnodeConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Signer should be present
    expect(screen.getByTestId('has-signer')).toHaveTextContent('yes');

    // Simulate server dropping the connection
    React.act(() => {
      handlers['close']?.forEach((h) => h());
    });

    // Status should go to disconnected, but signer should remain (for light reconnect)
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
    });
    expect(screen.getByTestId('has-signer')).toHaveTextContent('yes');
  });

  it('method returns correct result after reconnect', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Kill the WS
    const initialWs = await mockOpenClearnodeWs.mock.results[0].value;
    initialWs.readyState = WebSocket.CLOSED;

    // Set up fresh WS + auth for reconnect
    const freshWs = createMockWs();
    mockOpenClearnodeWs.mockResolvedValueOnce(freshWs);
    mockAuthenticateBrowser.mockResolvedValueOnce({
      signer: 'mock-signer-reconnected',
      sessionAddress: '0xSESSION_RECONNECTED',
      expiresAt: Date.now() + 3600_000,
    });

    // Custom result for createAppSession
    mockCreateAppSession.mockResolvedValueOnce({ appSessionId: '0xRECONNECTED', version: 1, status: 'open' });

    await user.click(screen.getByTestId('call-createAppSession'));

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).toHaveTextContent('created:0xRECONNECTED');
    });
  });

  it('error propagates when reconnection fails', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeMethodConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Kill the WS
    const initialWs = await mockOpenClearnodeWs.mock.results[0].value;
    initialWs.readyState = WebSocket.CLOSED;

    // Make reconnect fail
    mockOpenClearnodeWs.mockRejectedValueOnce(new Error('Network unreachable'));

    await user.click(screen.getByTestId('call-getConfig'));

    await waitFor(() => {
      expect(screen.getByTestId('method-result')).toHaveTextContent('error:');
    });
  });

  // ── refreshBalance auto-reconnect tests ──

  it('refreshBalance auto-reconnects when WS is dead', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeConsumerWithActions />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
      expect(screen.getByTestId('balance')).toHaveTextContent('1000000');
    });

    // Simulate WS drop
    const initialWs = await mockOpenClearnodeWs.mock.results[0].value;
    initialWs.readyState = WebSocket.CLOSED;

    // Set up fresh WS + auth for full reconnect
    const freshWs = createMockWs();
    mockOpenClearnodeWs.mockResolvedValueOnce(freshWs);
    mockAuthenticateBrowser.mockResolvedValueOnce({
      signer: 'mock-signer-refresh',
      sessionAddress: '0xSESSION_REFRESH',
      expiresAt: Date.now() + 3600_000,
    });

    // Set up updated balance response
    mockSendAndWaitBrowser.mockResolvedValueOnce('{"res":[1,"get_ledger_balances",{}]}');

    // Click refresh — should auto-reconnect (full auth) + fetch new balance
    await user.click(screen.getByTestId('refresh-balance'));

    await waitFor(() => {
      // Should have opened a new WS (initial + 1 reconnect)
      expect(mockOpenClearnodeWs).toHaveBeenCalledTimes(2);
    });
  });

  it('refreshBalance is non-fatal when reconnect fails', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClearnodeConsumerWithActions />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
      expect(screen.getByTestId('balance')).toHaveTextContent('1000000');
    });

    // Simulate WS drop
    const initialWs = await mockOpenClearnodeWs.mock.results[0].value;
    initialWs.readyState = WebSocket.CLOSED;

    // Make reconnect fail
    mockOpenClearnodeWs.mockRejectedValueOnce(new Error('Network unreachable'));

    // Click refresh — should NOT crash
    await user.click(screen.getByTestId('refresh-balance'));

    // Wait a tick — no crash, balance preserved from initial fetch
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByTestId('balance')).toHaveTextContent('1000000');
  });

  // ── Keepalive tests ──

  it('sends keepalive get_config message every 30 seconds', async () => {
    jest.useFakeTimers();

    const mockWs = createMockWs();
    mockOpenClearnodeWs.mockResolvedValue(mockWs);

    renderWithProviders(<ClearnodeConsumer />);

    // Wait for auth to complete
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    // Reset send mock to isolate keepalive calls from auth traffic
    mockWs.send.mockClear();

    // Advance 30s — should trigger one keepalive
    jest.advanceTimersByTime(30_000);
    expect(mockWs.send).toHaveBeenCalledTimes(1);
    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('get_config'));

    // Advance another 30s — second keepalive
    mockWs.send.mockClear();
    jest.advanceTimersByTime(30_000);
    expect(mockWs.send).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
