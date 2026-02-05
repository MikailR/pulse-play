import { buildApp } from '../app.js';
import { createTestContext } from '../context.js';
import type { AppContext } from '../context.js';
import type { FastifyInstance } from 'fastify';

describe('Admin Routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createTestContext();
    app = await buildApp(ctx);
  });

  afterEach(async () => {
    await app.close();
  });

  test('returns full state with no market', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/state' });
    const body = res.json();
    expect(body.market).toBeNull();
    expect(body.positionCount).toBe(0);
    expect(body.connectionCount).toBe(0);
  });

  test('returns full state with active market and positions', async () => {
    ctx.marketManager.createMarket('m1');
    ctx.marketManager.openMarket('m1');
    ctx.positionTracker.addPosition({
      address: '0xAlice',
      marketId: 'm1',
      outcome: 'BALL',
      shares: 5,
      costPaid: 2.5,
      appSessionId: 'sess1',
      timestamp: 1000,
    });

    const res = await app.inject({ method: 'GET', url: '/api/admin/state' });
    const body = res.json();
    expect(body.market).not.toBeNull();
    expect(body.market.id).toBe('m1');
    expect(body.positionCount).toBe(1);
  });

  test('includes gameState in response', async () => {
    ctx.oracle.setGameActive(true);
    const res = await app.inject({ method: 'GET', url: '/api/admin/state' });
    expect(res.json().gameState).toEqual({ active: true });
  });

  test('reset clears all state to clean', async () => {
    ctx.marketManager.createMarket('m1');
    ctx.marketManager.openMarket('m1');
    ctx.oracle.setGameActive(true);

    await app.inject({ method: 'POST', url: '/api/admin/reset' });

    const res = await app.inject({ method: 'GET', url: '/api/admin/state' });
    const body = res.json();
    expect(body.market).toBeNull();
    expect(body.gameState.active).toBe(false);
  });

  test('reset returns success', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/admin/reset' });
    expect(res.json().success).toBe(true);
  });

  test('reset stops auto-play if running', async () => {
    const spy = jest.spyOn(ctx.oracle, 'stopAutoPlay');
    await app.inject({ method: 'POST', url: '/api/admin/reset' });
    expect(spy).toHaveBeenCalled();
  });
});
