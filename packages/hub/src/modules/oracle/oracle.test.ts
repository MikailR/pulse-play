import { OracleService } from './oracle.js';
import type { OracleCallbacks } from './types.js';

describe('OracleService', () => {
  let oracle: OracleService;
  let callbacks: OracleCallbacks;

  beforeEach(() => {
    jest.useFakeTimers();
    oracle = new OracleService();
    callbacks = {
      onOpenMarket: jest.fn(),
      onCloseMarket: jest.fn(),
      onResolve: jest.fn(),
    };
    oracle.setCallbacks(callbacks);
  });

  afterEach(() => {
    oracle.stopAutoPlay();
    jest.useRealTimers();
  });

  test('initial state is inactive', () => {
    expect(oracle.getGameState()).toEqual({ active: false });
    expect(oracle.isActive()).toBe(false);
  });

  test('setGameActive(true) makes game active', () => {
    oracle.setGameActive(true);
    expect(oracle.isActive()).toBe(true);
    expect(oracle.getGameState().active).toBe(true);
  });

  test('setGameActive(false) makes game inactive', () => {
    oracle.setGameActive(true);
    oracle.setGameActive(false);
    expect(oracle.isActive()).toBe(false);
  });

  test('getGameState() returns a copy (not reference)', () => {
    const state1 = oracle.getGameState();
    state1.active = true;
    expect(oracle.isActive()).toBe(false);
  });

  test('reset() restores initial state', () => {
    oracle.setGameActive(true);
    oracle.reset();
    expect(oracle.isActive()).toBe(false);
  });

  test('startAutoPlay triggers onOpenMarket callback', () => {
    oracle.startAutoPlay({ openDelayMs: 1000, closeDelayMs: 2000, resolveDelayMs: 500 });

    jest.advanceTimersByTime(1000);
    expect(callbacks.onOpenMarket).toHaveBeenCalledTimes(1);
  });

  test('auto-play cycle: open → close → resolve fires in correct order', () => {
    oracle.startAutoPlay({
      openDelayMs: 100,
      closeDelayMs: 200,
      resolveDelayMs: 300,
      outcomes: ['BALL'],
    });

    // After openDelay: open fires
    jest.advanceTimersByTime(100);
    expect(callbacks.onOpenMarket).toHaveBeenCalledTimes(1);
    expect(callbacks.onCloseMarket).not.toHaveBeenCalled();

    // After closeDelay: close fires
    jest.advanceTimersByTime(200);
    expect(callbacks.onCloseMarket).toHaveBeenCalledTimes(1);
    expect(callbacks.onResolve).not.toHaveBeenCalled();

    // After resolveDelay: resolve fires
    jest.advanceTimersByTime(300);
    expect(callbacks.onResolve).toHaveBeenCalledTimes(1);
    expect(callbacks.onResolve).toHaveBeenCalledWith('BALL');
  });

  test('auto-play uses RANDOM outcomes when configured', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.3); // < 0.5 → BALL
    oracle.startAutoPlay({
      openDelayMs: 100,
      closeDelayMs: 100,
      resolveDelayMs: 100,
      outcomes: 'RANDOM',
    });

    jest.advanceTimersByTime(300);
    expect(callbacks.onResolve).toHaveBeenCalledWith('BALL');

    jest.spyOn(Math, 'random').mockRestore();
  });

  test('auto-play uses fixed outcomes from sequence', () => {
    oracle.startAutoPlay({
      openDelayMs: 100,
      closeDelayMs: 100,
      resolveDelayMs: 100,
      outcomes: ['BALL', 'STRIKE', 'BALL'],
    });

    // First cycle
    jest.advanceTimersByTime(300);
    expect(callbacks.onResolve).toHaveBeenCalledWith('BALL');

    // Gap before next cycle + second cycle
    jest.advanceTimersByTime(100 + 300);
    expect(callbacks.onResolve).toHaveBeenCalledWith('STRIKE');
  });

  test('stopAutoPlay stops the timer', () => {
    oracle.startAutoPlay({ openDelayMs: 100, closeDelayMs: 100, resolveDelayMs: 100 });

    jest.advanceTimersByTime(100); // open fires
    expect(callbacks.onOpenMarket).toHaveBeenCalledTimes(1);

    oracle.stopAutoPlay();
    jest.advanceTimersByTime(10000);
    expect(callbacks.onCloseMarket).not.toHaveBeenCalled();
  });

  test('startAutoPlay when already running replaces previous', () => {
    oracle.startAutoPlay({ openDelayMs: 100, closeDelayMs: 100, resolveDelayMs: 100 });
    oracle.startAutoPlay({
      openDelayMs: 200,
      closeDelayMs: 100,
      resolveDelayMs: 100,
      outcomes: ['STRIKE'],
    });

    // Old timer at 100ms should not fire
    jest.advanceTimersByTime(100);
    expect(callbacks.onOpenMarket).not.toHaveBeenCalled();

    // New timer at 200ms should fire
    jest.advanceTimersByTime(100);
    expect(callbacks.onOpenMarket).toHaveBeenCalledTimes(1);
  });
});
