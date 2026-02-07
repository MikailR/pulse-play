import { renderHook, act, waitFor } from '@testing-library/react';
import { useBet } from './useBet';
import * as api from '@/lib/api';

// Typed test global for mutable config values
const testGlobals = globalThis as typeof globalThis & { __TEST_MM_ADDRESS__?: string };

// Mock dependencies
jest.mock('@/lib/api');
jest.mock('@/hooks/useClearnode');
jest.mock('@/lib/config', () => ({
  get MM_ADDRESS() { return testGlobals.__TEST_MM_ADDRESS__; },
}));

const mockPlaceBet = api.placeBet as jest.MockedFunction<typeof api.placeBet>;

// Import after mocks
import { useClearnode } from '@/hooks/useClearnode';
const mockUseClearnode = useClearnode as jest.MockedFunction<typeof useClearnode>;
const mockCreateAppSession = jest.fn();

function setupClearnodeMock(overrides: Partial<ReturnType<typeof useClearnode>> = {}) {
  mockUseClearnode.mockReturnValue({
    status: 'connected',
    error: null,
    isSessionValid: true,
    expiresAt: Date.now() + 3600000,
    signer: null,
    ws: null,
    balance: '1000000',
    allowanceAmount: 1000,
    setAllowanceAmount: jest.fn(),
    refreshBalance: jest.fn(),
    reconnect: jest.fn(),
    disconnect: jest.fn(),
    createAppSession: mockCreateAppSession,
    closeAppSession: jest.fn(),
    submitAppState: jest.fn(),
    transfer: jest.fn(),
    getAppSessions: jest.fn(),
    getConfig: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useClearnode>);
}

describe('useBet', () => {
  beforeEach(() => {
    mockPlaceBet.mockReset();
    mockCreateAppSession.mockReset();
    mockCreateAppSession.mockResolvedValue({
      appSessionId: '0xSESSION123',
      version: 1,
      status: 'open',
    });
    testGlobals.__TEST_MM_ADDRESS__ = '0xMM';
    setupClearnodeMock();
  });

  it('returns error when required params are missing', async () => {
    const { result } = renderHook(() => useBet({}));

    let response: unknown;
    await act(async () => {
      response = await result.current.bet('BALL', 10);
    });

    expect(response).toBeNull();
    expect(result.current.error).toBe('Missing required bet parameters');
  });

  it('full success flow: creates session then notifies hub', async () => {
    mockPlaceBet.mockResolvedValueOnce({
      accepted: true,
      shares: 9.5,
      newPriceBall: 0.55,
      newPriceStrike: 0.45,
    });

    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useBet({
        address: '0x123',
        marketId: 'market-1',
        onSuccess,
      })
    );

    let response: unknown;
    await act(async () => {
      response = await result.current.bet('BALL', 10);
    });

    // Verify createAppSession was called with correct params (including V1 sessionData)
    expect(mockCreateAppSession).toHaveBeenCalledWith(
      expect.objectContaining({
        counterparty: '0xMM',
        allocations: [
          { asset: 'ytest.usd', amount: '10000000', participant: '0x123' },
          { asset: 'ytest.usd', amount: '0', participant: '0xMM' },
        ],
        sessionData: expect.stringContaining('"v":1'),
      }),
    );

    // Verify placeBet was called with the real session ID
    expect(mockPlaceBet).toHaveBeenCalledWith({
      address: '0x123',
      marketId: 'market-1',
      outcome: 'BALL',
      amount: 10,
      appSessionId: '0xSESSION123',
      appSessionVersion: 1,
    });

    expect(response).toEqual(expect.objectContaining({ accepted: true }));
    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('calls refreshBalance after successful bet', async () => {
    const mockRefreshBalance = jest.fn();
    setupClearnodeMock({ refreshBalance: mockRefreshBalance });
    mockPlaceBet.mockResolvedValueOnce({ accepted: true, shares: 9.5 });

    const { result } = renderHook(() =>
      useBet({ address: '0x123', marketId: 'market-1' })
    );

    await act(async () => {
      await result.current.bet('BALL', 10);
    });

    expect(mockRefreshBalance).toHaveBeenCalledTimes(1);
  });

  it('does not call refreshBalance when bet is rejected', async () => {
    const mockRefreshBalance = jest.fn();
    setupClearnodeMock({ refreshBalance: mockRefreshBalance });
    mockPlaceBet.mockResolvedValueOnce({ accepted: false, reason: 'No' });

    const { result } = renderHook(() =>
      useBet({ address: '0x123', marketId: 'market-1' })
    );

    await act(async () => {
      await result.current.bet('BALL', 10);
    });

    expect(mockRefreshBalance).not.toHaveBeenCalled();
  });

  it('shows error when Clearnode session creation fails (hub never called)', async () => {
    mockCreateAppSession.mockRejectedValueOnce(new Error('Session creation failed'));

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useBet({
        address: '0x123',
        marketId: 'market-1',
        onError,
      })
    );

    await act(async () => {
      await result.current.bet('BALL', 10);
    });

    expect(result.current.error).toBe('Session creation failed');
    expect(onError).toHaveBeenCalled();
    // Hub should never be called
    expect(mockPlaceBet).not.toHaveBeenCalled();
  });

  it('shows error with reason when hub rejects bet', async () => {
    mockPlaceBet.mockResolvedValueOnce({
      accepted: false,
      reason: 'Market not open',
    });

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useBet({
        address: '0x123',
        marketId: 'market-1',
        onError,
      })
    );

    await act(async () => {
      await result.current.bet('STRIKE', 5);
    });

    expect(result.current.error).toBe('Market not open');
    expect(onError).toHaveBeenCalled();
    // Session should have been created before hub call
    expect(mockCreateAppSession).toHaveBeenCalled();
  });

  it('step transitions correctly during bet flow', async () => {
    const steps: string[] = [];
    let resolveSession: (value: unknown) => void;
    let resolveHubCall: (value: unknown) => void;

    mockCreateAppSession.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve as (value: unknown) => void;
        })
    );
    mockPlaceBet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveHubCall = resolve as (value: unknown) => void;
        })
    );

    const { result } = renderHook(() =>
      useBet({
        address: '0x123',
        marketId: 'market-1',
      })
    );

    expect(result.current.step).toBe('idle');

    let betPromise: Promise<unknown>;
    act(() => {
      betPromise = result.current.bet('BALL', 10);
    });

    await waitFor(() => {
      expect(result.current.step).toBe('creating-session');
    });
    steps.push(result.current.step);

    await act(async () => {
      resolveSession!({ appSessionId: '0xSESSION', version: 1, status: 'open' });
    });

    await waitFor(() => {
      expect(result.current.step).toBe('notifying-hub');
    });
    steps.push(result.current.step);

    await act(async () => {
      resolveHubCall!({ accepted: true, shares: 5 });
      await betPromise;
    });

    expect(result.current.step).toBe('idle');
    expect(steps).toEqual(['creating-session', 'notifying-hub']);
  });

  it('returns error when MM_ADDRESS is not configured', async () => {
    testGlobals.__TEST_MM_ADDRESS__ = undefined;

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useBet({
        address: '0x123',
        marketId: 'market-1',
        onError,
      })
    );

    await act(async () => {
      await result.current.bet('BALL', 10);
    });

    expect(result.current.error).toBe('MM_ADDRESS not configured');
    expect(mockCreateAppSession).not.toHaveBeenCalled();
  });

  it('passes V1 sessionData containing marketId, outcome, amount to createAppSession', async () => {
    mockPlaceBet.mockResolvedValueOnce({
      accepted: true,
      shares: 9.5,
      newPriceBall: 0.55,
      newPriceStrike: 0.45,
    });

    const { result } = renderHook(() =>
      useBet({ address: '0x123', marketId: 'market-1' })
    );

    await act(async () => {
      await result.current.bet('BALL', 10);
    });

    const callArgs = mockCreateAppSession.mock.calls[0][0];
    expect(callArgs.sessionData).toBeDefined();
    const sessionData = JSON.parse(callArgs.sessionData);
    expect(sessionData.v).toBe(1);
    expect(sessionData.marketId).toBe('market-1');
    expect(sessionData.outcome).toBe('BALL');
    expect(sessionData.amount).toBe(10);
    expect(sessionData.timestamp).toEqual(expect.any(Number));
  });

  it('calls createAppSession even when status is disconnected (transparent reconnection)', async () => {
    setupClearnodeMock({ status: 'disconnected' });

    mockPlaceBet.mockResolvedValueOnce({
      accepted: true,
      shares: 9.5,
      newPriceBall: 0.55,
      newPriceStrike: 0.45,
    });

    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useBet({
        address: '0x123',
        marketId: 'market-1',
        onSuccess,
      })
    );

    await act(async () => {
      await result.current.bet('BALL', 10);
    });

    // createAppSession should still be called — it handles reconnection internally
    expect(mockCreateAppSession).toHaveBeenCalled();
    expect(mockPlaceBet).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading during request', async () => {
    let resolveSession: (value: unknown) => void;
    mockCreateAppSession.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve as (value: unknown) => void;
        })
    );

    const { result } = renderHook(() =>
      useBet({
        address: '0x123',
        marketId: 'market-1',
      })
    );

    expect(result.current.isLoading).toBe(false);

    let betPromise: Promise<unknown>;
    act(() => {
      betPromise = result.current.bet('BALL', 10);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    mockPlaceBet.mockResolvedValueOnce({ accepted: true });

    await act(async () => {
      resolveSession!({ appSessionId: '0xSESSION', version: 1, status: 'open' });
      await betPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });
});
