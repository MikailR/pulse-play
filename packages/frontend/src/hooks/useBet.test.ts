import { renderHook, act, waitFor } from '@testing-library/react';
import { useBet } from './useBet';
import * as api from '@/lib/api';

jest.mock('@/lib/api');
const mockPlaceBet = api.placeBet as jest.MockedFunction<typeof api.placeBet>;

describe('useBet', () => {
  beforeEach(() => {
    mockPlaceBet.mockReset();
  });

  it('returns error when required params are missing', async () => {
    const { result } = renderHook(() => useBet({}));

    let response: unknown;
    await act(async () => {
      response = await result.current.bet('Ball', 10);
    });

    expect(response).toBeNull();
    expect(result.current.error).toBe('Missing required bet parameters');
  });

  it('places bet successfully', async () => {
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
        appSessionId: 'session-1',
        onSuccess,
      })
    );

    let response: unknown;
    await act(async () => {
      response = await result.current.bet('Ball', 10);
    });

    expect(mockPlaceBet).toHaveBeenCalledWith({
      address: '0x123',
      marketId: 'market-1',
      outcome: 'Ball',
      amount: 10,
      appSessionId: 'session-1',
    });
    expect(response).toEqual(expect.objectContaining({ accepted: true }));
    expect(result.current.lastResponse?.accepted).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('handles rejected bet', async () => {
    mockPlaceBet.mockResolvedValueOnce({
      accepted: false,
      reason: 'Market not open',
    });

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useBet({
        address: '0x123',
        marketId: 'market-1',
        appSessionId: 'session-1',
        onError,
      })
    );

    await act(async () => {
      await result.current.bet('Strike', 5);
    });

    expect(result.current.error).toBe('Market not open');
    expect(onError).toHaveBeenCalled();
  });

  it('handles API error', async () => {
    mockPlaceBet.mockRejectedValueOnce(new Error('Network error'));

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useBet({
        address: '0x123',
        marketId: 'market-1',
        appSessionId: 'session-1',
        onError,
      })
    );

    await act(async () => {
      await result.current.bet('Ball', 10);
    });

    expect(result.current.error).toBe('Network error');
    expect(onError).toHaveBeenCalled();
  });

  it('sets isLoading during request', async () => {
    let resolvePromise: (value: unknown) => void;
    mockPlaceBet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve as (value: unknown) => void;
        })
    );

    const { result } = renderHook(() =>
      useBet({
        address: '0x123',
        marketId: 'market-1',
        appSessionId: 'session-1',
      })
    );

    expect(result.current.isLoading).toBe(false);

    let betPromise: Promise<unknown>;
    act(() => {
      betPromise = result.current.bet('Ball', 10);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      resolvePromise!({ accepted: true });
      await betPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });
});
