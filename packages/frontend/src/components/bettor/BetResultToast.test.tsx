import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { BetResultToast } from './BetResultToast';
import type { WsMessage } from '@/lib/types';

// Store subscribe handler for testing
let subscribeHandler: ((message: WsMessage) => void) | null = null;

jest.mock('@/providers/WebSocketProvider', () => ({
  useWebSocket: jest.fn(() => ({
    subscribe: jest.fn((handler) => {
      subscribeHandler = handler;
      return () => {
        subscribeHandler = null;
      };
    }),
  })),
}));

describe('BetResultToast', () => {
  beforeEach(() => {
    subscribeHandler = null;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when no toasts', () => {
    const { container } = render(<BetResultToast />);
    expect(container.firstChild).toBeNull();
  });

  it('shows win toast on WIN message', async () => {
    render(<BetResultToast />);

    await act(async () => {
      subscribeHandler?.({
        type: 'BET_RESULT',
        result: 'WIN',
        marketId: 'market-1',
        payout: 15.5,
      });
    });

    expect(screen.getByTestId('toast-win')).toBeInTheDocument();
    expect(screen.getByTestId('toast-title')).toHaveTextContent('You Won!');
    expect(screen.getByTestId('toast-amount')).toHaveTextContent('+$15.50');
  });

  it('shows loss toast on LOSS message', async () => {
    render(<BetResultToast />);

    await act(async () => {
      subscribeHandler?.({
        type: 'BET_RESULT',
        result: 'LOSS',
        marketId: 'market-1',
        loss: 10,
      });
    });

    expect(screen.getByTestId('toast-loss')).toBeInTheDocument();
    expect(screen.getByTestId('toast-title')).toHaveTextContent('You Lost');
    expect(screen.getByTestId('toast-amount')).toHaveTextContent('-$10.00');
  });

  it('auto-removes toast after duration', async () => {
    render(<BetResultToast duration={1000} />);

    await act(async () => {
      subscribeHandler?.({
        type: 'BET_RESULT',
        result: 'WIN',
        marketId: 'market-1',
        payout: 10,
      });
    });

    expect(screen.getByTestId('toast-win')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByTestId('toast-win')).not.toBeInTheDocument();
  });
});
