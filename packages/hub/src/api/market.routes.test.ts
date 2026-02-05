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
    ctx.marketManager.createMarket('m1');
    ctx.marketManager.openMarket('m1');

    const res = await app.inject({ method: 'GET', url: '/api/market' });
    const body = res.json();
    expect(body.market).not.toBeNull();
    expect(body.market.id).toBe('m1');
    expect(body.market.status).toBe('OPEN');
    expect(body.priceBall).toBeCloseTo(0.5);
    expect(body.priceStrike).toBeCloseTo(0.5);
  });

  test('returns current market with shifted prices after bets', async () => {
    ctx.marketManager.createMarket('m1');
    ctx.marketManager.openMarket('m1');
    ctx.marketManager.updateQuantities('m1', 10, 0);

    const res = await app.inject({ method: 'GET', url: '/api/market' });
    const body = res.json();
    expect(body.priceBall).toBeGreaterThan(0.5);
    expect(body.priceStrike).toBeLessThan(0.5);
  });

  test('returns market in CLOSED state', async () => {
    ctx.marketManager.createMarket('m1');
    ctx.marketManager.openMarket('m1');
    ctx.marketManager.closeMarket('m1');

    const res = await app.inject({ method: 'GET', url: '/api/market' });
    expect(res.json().market.status).toBe('CLOSED');
  });

  test('returns market in RESOLVED state with outcome', async () => {
    ctx.marketManager.createMarket('m1');
    ctx.marketManager.openMarket('m1');
    ctx.marketManager.closeMarket('m1');
    ctx.marketManager.resolveMarket('m1', 'BALL');

    const res = await app.inject({ method: 'GET', url: '/api/market' });
    const body = res.json();
    expect(body.market.status).toBe('RESOLVED');
    expect(body.market.outcome).toBe('BALL');
  });

  test('returns 404 for non-existent marketId', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/market/nope' });
    expect(res.statusCode).toBe(404);
  });

  test('returns specific market by ID', async () => {
    ctx.marketManager.createMarket('m1');
    ctx.marketManager.openMarket('m1');

    const res = await app.inject({ method: 'GET', url: '/api/market/m1' });
    expect(res.json().market.id).toBe('m1');
  });

  test('returns correct prices for specific market', async () => {
    ctx.marketManager.createMarket('m1');
    ctx.marketManager.openMarket('m1');
    ctx.marketManager.updateQuantities('m1', 20, 0);

    const res = await app.inject({ method: 'GET', url: '/api/market/m1' });
    const body = res.json();
    expect(body.priceBall).toBeGreaterThan(0.5);
    expect(body.priceStrike).toBeLessThan(0.5);
  });
});
