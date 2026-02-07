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
});
