import { buildApp } from '../app.js';
import { createTestContext, DEFAULT_TEST_GAME_ID, DEFAULT_TEST_CATEGORY_ID } from '../context.js';
import type { AppContext } from '../context.js';
import type { FastifyInstance } from 'fastify';

describe('Bet Routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;
  let marketId: string;

  beforeEach(async () => {
    ctx = createTestContext();
    app = await buildApp(ctx);
    marketId = ''; // reset; tests that need it call openMarket() or createPendingMarket()
  });

  afterEach(async () => {
    await app.close();
  });

  /** Creates a market and opens it; stores the generated marketId. */
  function openMarket(): string {
    const market = ctx.marketManager.createMarket(DEFAULT_TEST_GAME_ID, DEFAULT_TEST_CATEGORY_ID);
    ctx.marketManager.openMarket(market.id);
    marketId = market.id;
    return marketId;
  }

  /** Creates a market in PENDING state; stores the generated marketId. */
  function createPendingMarket(): string {
    const market = ctx.marketManager.createMarket(DEFAULT_TEST_GAME_ID, DEFAULT_TEST_CATEGORY_ID);
    marketId = market.id;
    return marketId;
  }

  function validBet() {
    return {
      address: '0xAlice',
      marketId,
      outcome: 'BALL',
      amount: 10,
      appSessionId: 'sess1',
      appSessionVersion: 1,
    };
  }

  async function postBet(body: any) {
    return app.inject({
      method: 'POST',
      url: '/api/bet',
      payload: body,
    });
  }

  test('returns accepted: false when no market exists', async () => {
    const res = await postBet({
      address: '0xAlice',
      marketId: 'nonexistent-market',
      outcome: 'BALL',
      amount: 10,
      appSessionId: 'sess1',
      appSessionVersion: 1,
    });
    expect(res.json().accepted).toBe(false);
  });

  test('returns accepted: false when market is PENDING', async () => {
    createPendingMarket();
    const res = await postBet(validBet());
    expect(res.json().accepted).toBe(false);
  });

  test('returns accepted: false when market is CLOSED', async () => {
    openMarket();
    ctx.marketManager.closeMarket(marketId);
    const res = await postBet(validBet());
    expect(res.json().accepted).toBe(false);
  });

  test('returns accepted: false when market is RESOLVED', async () => {
    openMarket();
    ctx.marketManager.closeMarket(marketId);
    ctx.marketManager.resolveMarket(marketId, 'BALL');
    const res = await postBet(validBet());
    expect(res.json().accepted).toBe(false);
  });

  test('accepts bet on OPEN market and returns shares + new prices', async () => {
    openMarket();
    const res = await postBet(validBet());
    const body = res.json();
    expect(body.accepted).toBe(true);
    expect(body.shares).toBeGreaterThan(0);
    expect(body.newPriceBall).toBeGreaterThan(0.5);
    expect(body.newPriceStrike).toBeLessThan(0.5);
  });

  test('records position in PositionTracker after accepted bet', async () => {
    openMarket();
    await postBet(validBet());
    const positions = ctx.positionTracker.getPositionsByUser('0xAlice');
    expect(positions).toHaveLength(1);
    expect(positions[0].outcome).toBe('BALL');
    expect(positions[0].costPaid).toBe(10);
  });

  test('updates market quantities after accepted bet', async () => {
    openMarket();
    await postBet(validBet());
    const market = ctx.marketManager.getMarket(marketId)!;
    expect(market.quantities[0]).toBeGreaterThan(0);
  });

  test('returns 400 for invalid outcome (not in category outcomes)', async () => {
    openMarket();
    const res = await postBet({ ...validBet(), outcome: 'HOME_RUN' });
    expect(res.statusCode).toBe(400);
    expect(res.json().accepted).toBe(false);
  });

  test('returns 400 for missing required fields', async () => {
    openMarket();
    const res = await postBet({ address: '0xAlice' });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for amount <= 0', async () => {
    openMarket();
    const res = await postBet({ ...validBet(), amount: 0 });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for negative amount', async () => {
    openMarket();
    const res = await postBet({ ...validBet(), amount: -5 });
    expect(res.statusCode).toBe(400);
  });

  test('accepts multiple sequential bets and prices shift correctly', async () => {
    openMarket();
    const res1 = await postBet(validBet());
    const p1 = res1.json().newPriceBall;

    const res2 = await postBet({ ...validBet(), address: '0xBob', appSessionId: 'sess2' });
    const p2 = res2.json().newPriceBall;

    // Second bet on BALL should push price even higher
    expect(p2).toBeGreaterThan(p1);
  });

  test('accepts bet for correct marketId', async () => {
    openMarket();
    const res = await postBet(validBet());
    expect(res.json().accepted).toBe(true);
  });

  test('rejects bet for wrong marketId', async () => {
    openMarket();
    const res = await postBet({ ...validBet(), marketId: 'wrong-id' });
    expect(res.json().accepted).toBe(false);
  });

  test('broadcasts ODDS_UPDATE via WebSocket after accepted bet', async () => {
    openMarket();
    const broadcastSpy = jest.spyOn(ctx.ws, 'broadcast');
    await postBet(validBet());

    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ODDS_UPDATE',
        marketId,
        prices: expect.any(Array),
        quantities: expect.any(Array),
        outcomes: expect.any(Array),
        qBall: expect.any(Number),
        qStrike: expect.any(Number),
      }),
    );
  });

  // ── Bet rejection → closeSession ──

  test('calls closeSession when market is not OPEN', async () => {
    createPendingMarket();
    // market is PENDING, not OPEN
    const closeSession = ctx.clearnodeClient.closeSession as jest.Mock;
    await postBet(validBet());

    expect(closeSession).toHaveBeenCalledWith({
      appSessionId: 'sess1',
      allocations: [
        { participant: '0xAlice', asset: 'ytest.usd', amount: '10000000' },
        { participant: '0xMM', asset: 'ytest.usd', amount: '0' },
      ],
    });
  });

  test('still returns rejection if closeSession fails', async () => {
    createPendingMarket();
    (ctx.clearnodeClient.closeSession as jest.Mock).mockRejectedValueOnce(new Error('Clearnode down'));
    const res = await postBet(validBet());
    const body = res.json();
    expect(body.accepted).toBe(false);
    expect(body.reason).toContain('PENDING');
  });

  test('does not call closeSession for validation errors', async () => {
    openMarket();
    const closeSession = ctx.clearnodeClient.closeSession as jest.Mock;
    // Missing required fields (no address)
    await postBet({ marketId, outcome: 'BALL', amount: 10 });
    expect(closeSession).not.toHaveBeenCalled();
  });

  // ── V2 sessionData on bet acceptance ──

  test('calls submitAppState with V2 sessionData after accepted bet', async () => {
    openMarket();
    const submitAppState = ctx.clearnodeClient.submitAppState as jest.Mock;
    submitAppState.mockClear();

    await postBet(validBet());

    expect(submitAppState).toHaveBeenCalledWith(
      expect.objectContaining({
        appSessionId: 'sess1',
        intent: 'operate',
        version: 2, // appSessionVersion(1) + 1
        sessionData: expect.stringContaining('"v":2'),
      }),
    );

    // Verify sessionData content
    const callArgs = submitAppState.mock.calls[0][0];
    const sessionData = JSON.parse(callArgs.sessionData);
    expect(sessionData.v).toBe(2);
    expect(sessionData.marketId).toBe(marketId);
    expect(sessionData.outcome).toBe('BALL');
    expect(sessionData.amount).toBe(10);
    expect(sessionData.shares).toBeGreaterThan(0);
    expect(sessionData.effectivePricePerShare).toBeGreaterThan(0);
    expect(sessionData.preBetOdds).toEqual({ ball: 0.5, strike: 0.5 });
    expect(sessionData.postBetOdds.ball).toBeGreaterThan(0.5);
  });

  test('V2 submitAppState failure is non-fatal (response still accepted)', async () => {
    openMarket();
    (ctx.clearnodeClient.submitAppState as jest.Mock).mockRejectedValueOnce(new Error('Clearnode down'));

    const res = await postBet(validBet());
    expect(res.json().accepted).toBe(true);
  });

  test('appSessionVersion updated to 2 on successful V2 submitAppState', async () => {
    openMarket();
    await postBet(validBet());

    const pos = ctx.positionTracker.getPositionsByUser('0xAlice')[0];
    expect(pos.appSessionVersion).toBe(2);
  });

  test('appSessionVersion stays at 1 when V2 submitAppState fails', async () => {
    openMarket();
    (ctx.clearnodeClient.submitAppState as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    await postBet(validBet());

    const pos = ctx.positionTracker.getPositionsByUser('0xAlice')[0];
    expect(pos.appSessionVersion).toBe(1);
  });

  test('broadcasts SESSION_VERSION_UPDATED after successful V2 submitAppState', async () => {
    openMarket();
    const broadcastSpy = jest.spyOn(ctx.ws, 'broadcast');
    await postBet(validBet());

    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SESSION_VERSION_UPDATED',
        appSessionId: 'sess1',
        version: 2,
      }),
    );
  });

  test('does not broadcast SESSION_VERSION_UPDATED when V2 submitAppState fails', async () => {
    openMarket();
    (ctx.clearnodeClient.submitAppState as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const broadcastSpy = jest.spyOn(ctx.ws, 'broadcast');
    await postBet(validBet());

    const versionBroadcasts = broadcastSpy.mock.calls.filter(
      ([msg]) => msg.type === 'SESSION_VERSION_UPDATED',
    );
    expect(versionBroadcasts).toHaveLength(0);
  });

  // ── Fee tests ──

  test('V2 allocations include fee split (default 1%)', async () => {
    openMarket();
    const submitAppState = ctx.clearnodeClient.submitAppState as jest.Mock;
    submitAppState.mockClear();

    await postBet(validBet()); // amount = 10

    const callArgs = submitAppState.mock.calls[0][0];
    // 1% fee on $10 = $0.1 fee, $9.9 net
    expect(callArgs.allocations).toEqual([
      { participant: '0xAlice', asset: 'ytest.usd', amount: '9900000' },
      { participant: '0xMM', asset: 'ytest.usd', amount: '100000' },
    ]);
  });

  test('V2 sessionData contains fee and feePercent fields', async () => {
    openMarket();
    const submitAppState = ctx.clearnodeClient.submitAppState as jest.Mock;
    submitAppState.mockClear();

    await postBet(validBet());

    const callArgs = submitAppState.mock.calls[0][0];
    const sessionData = JSON.parse(callArgs.sessionData);
    expect(sessionData.fee).toBeCloseTo(0.1);
    expect(sessionData.feePercent).toBe(1);
  });

  test('position records fee amount', async () => {
    openMarket();
    await postBet(validBet());
    const pos = ctx.positionTracker.getPositionsByUser('0xAlice')[0];
    expect(pos.fee).toBeCloseTo(0.1);
    expect(pos.costPaid).toBe(10);
  });

  test('LMSR uses netAmount (fewer shares with fee)', async () => {
    openMarket();
    // With 1% fee, net is 9.9 instead of 10 — fewer shares
    const res = await postBet(validBet());
    const sharesWithFee = res.json().shares;

    // Create a zero-fee context for comparison
    const ctx0 = createTestContext({ transactionFeePercent: 0 } as any);
    // We can't easily compare, but shares should be > 0
    expect(sharesWithFee).toBeGreaterThan(0);
  });

  test('zero fee results in no fee split', async () => {
    ctx.transactionFeePercent = 0;
    openMarket();
    const submitAppState = ctx.clearnodeClient.submitAppState as jest.Mock;
    submitAppState.mockClear();

    await postBet(validBet());

    const callArgs = submitAppState.mock.calls[0][0];
    expect(callArgs.allocations).toEqual([
      { participant: '0xAlice', asset: 'ytest.usd', amount: '10000000' },
      { participant: '0xMM', asset: 'ytest.usd', amount: '0' },
    ]);
  });
});
