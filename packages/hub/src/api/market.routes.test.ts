import { buildApp } from '../app.js';
import { createTestContext } from '../context.js';
import type { AppContext } from '../context.js';
import type { FastifyInstance } from 'fastify';

describe('Market Routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createTestContext();
    app = await buildApp(ctx);
  });

  afterEach(async () => {
    await app.close();
  });

  test('returns null market and 0.5/0.5 prices when no market exists', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/market' });
    const body = res.json();
    expect(body.market).toBeNull();
    expect(body.priceBall).toBe(0.5);
    expect(body.priceStrike).toBe(0.5);
  });

  test('returns current market with correct prices when OPEN', async () => {
    const market = ctx.marketManager.createMarket('test-game', 'pitching');
    ctx.marketManager.openMarket(market.id);

    const res = await app.inject({ method: 'GET', url: '/api/market' });
    const body = res.json();
    expect(body.market).not.toBeNull();
    expect(body.market.id).toBe(market.id);
    expect(body.market.status).toBe('OPEN');
    expect(body.priceBall).toBeCloseTo(0.5);
    expect(body.priceStrike).toBeCloseTo(0.5);
  });

  test('returns current market with shifted prices after bets', async () => {
    const market = ctx.marketManager.createMarket('test-game', 'pitching');
    ctx.marketManager.openMarket(market.id);
    ctx.marketManager.updateQuantities(market.id, [10, 0]);

    const res = await app.inject({ method: 'GET', url: '/api/market' });
    const body = res.json();
    expect(body.priceBall).toBeGreaterThan(0.5);
    expect(body.priceStrike).toBeLessThan(0.5);
  });

  test('returns market in CLOSED state', async () => {
    const market = ctx.marketManager.createMarket('test-game', 'pitching');
    ctx.marketManager.openMarket(market.id);
    ctx.marketManager.closeMarket(market.id);

    const res = await app.inject({ method: 'GET', url: '/api/market' });
    expect(res.json().market.status).toBe('CLOSED');
  });

  test('returns null for current market after resolution (resolved markets are excluded)', async () => {
    const market = ctx.marketManager.createMarket('test-game', 'pitching');
    ctx.marketManager.openMarket(market.id);
    ctx.marketManager.closeMarket(market.id);
    ctx.marketManager.resolveMarket(market.id, 'BALL');

    // getCurrentMarket() excludes RESOLVED markets, so /api/market returns null
    const res = await app.inject({ method: 'GET', url: '/api/market' });
    const body = res.json();
    expect(body.market).toBeNull();
    expect(body.priceBall).toBe(0.5);
    expect(body.priceStrike).toBe(0.5);
  });

  test('returns RESOLVED market with outcome via specific market endpoint', async () => {
    const market = ctx.marketManager.createMarket('test-game', 'pitching');
    ctx.marketManager.openMarket(market.id);
    ctx.marketManager.closeMarket(market.id);
    ctx.marketManager.resolveMarket(market.id, 'BALL');

    const res = await app.inject({ method: 'GET', url: `/api/market/${market.id}` });
    const body = res.json();
    expect(body.market.status).toBe('RESOLVED');
    expect(body.market.outcome).toBe('BALL');
  });

  test('returns 404 for non-existent marketId', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/market/nope' });
    expect(res.statusCode).toBe(404);
  });

  test('returns specific market by ID', async () => {
    const market = ctx.marketManager.createMarket('test-game', 'pitching');
    ctx.marketManager.openMarket(market.id);

    const res = await app.inject({ method: 'GET', url: `/api/market/${market.id}` });
    expect(res.json().market.id).toBe(market.id);
  });

  test('returns correct prices for specific market', async () => {
    const market = ctx.marketManager.createMarket('test-game', 'pitching');
    ctx.marketManager.openMarket(market.id);
    ctx.marketManager.updateQuantities(market.id, [20, 0]);

    const res = await app.inject({ method: 'GET', url: `/api/market/${market.id}` });
    const body = res.json();
    expect(body.priceBall).toBeGreaterThan(0.5);
    expect(body.priceStrike).toBeLessThan(0.5);
  });
});
