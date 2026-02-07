import { buildApp } from '../app.js';
import { createTestContext, DEFAULT_TEST_GAME_ID, DEFAULT_TEST_CATEGORY_ID } from '../context.js';
import type { AppContext } from '../context.js';
import type { FastifyInstance } from 'fastify';

describe('User Routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createTestContext();
    app = await buildApp(ctx);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/users/:address', () => {
    test('returns 404 for unknown user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users/0xUnknown',
      });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ error: 'User not found' });
    });

    test('returns user stats after recording bets', async () => {
      const address = '0xUser1';
      ctx.userTracker.recordBet(address, 100);
      ctx.userTracker.recordBet(address, 50);

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${address}`,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.user.address).toBe(address);
      expect(body.user.totalBets).toBe(2);
      expect(body.user.totalWagered).toBe(150);
    });

    test('user stats have all expected fields', async () => {
      const address = '0xUser2';
      ctx.userTracker.recordBet(address, 100);

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${address}`,
      });
      const { user } = res.json();
      expect(user).toHaveProperty('address');
      expect(user).toHaveProperty('totalBets');
      expect(user).toHaveProperty('totalWins');
      expect(user).toHaveProperty('totalLosses');
      expect(user).toHaveProperty('totalWagered');
      expect(user).toHaveProperty('totalPayout');
      expect(user).toHaveProperty('netPnl');
      expect(user).toHaveProperty('firstSeenAt');
      expect(user).toHaveProperty('lastActiveAt');
    });

    test('returns correct stats after recording wins and losses', async () => {
      const address = '0xUser3';
      ctx.userTracker.recordBet(address, 100);
      ctx.userTracker.recordWin(address, 150, 100); // profit = 50
      ctx.userTracker.recordBet(address, 80);
      ctx.userTracker.recordLoss(address, 80); // loss = -80

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${address}`,
      });
      const { user } = res.json();
      expect(user.totalBets).toBe(2);
      expect(user.totalWins).toBe(1);
      expect(user.totalLosses).toBe(1);
      expect(user.totalWagered).toBe(180);
      expect(user.totalPayout).toBe(150);
      expect(user.netPnl).toBe(-30); // 50 - 80
    });
  });

  describe('GET /api/users/:address/history', () => {
    test('returns empty array for user with no history', async () => {
      const address = '0xUser4';
      ctx.userTracker.ensureUser(address);

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${address}/history`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().history).toEqual([]);
    });

    test('returns empty array for non-existent user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users/0xNonExistent/history',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().history).toEqual([]);
    });

    test('returns settlement history after market resolution', async () => {
      const address = '0xUser5';

      // Create full market lifecycle
      const market = ctx.marketManager.createMarket(DEFAULT_TEST_GAME_ID, DEFAULT_TEST_CATEGORY_ID);
      ctx.marketManager.openMarket(market.id);

      // Add position for user
      ctx.positionTracker.addPosition({
        address,
        marketId: market.id,
        outcome: 'BALL',
        shares: 10,
        costPaid: 100,
        appSessionId: '0xSession1',
        appSessionVersion: 1,
        sessionStatus: 'open',
        timestamp: Date.now(),
      });

      // Close and resolve market (user wins)
      ctx.marketManager.closeMarket(market.id);
      ctx.marketManager.resolveMarket(market.id, 'BALL');

      // Clear positions to archive to settlements
      ctx.positionTracker.clearPositions(market.id);

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${address}/history`,
      });

      expect(res.statusCode).toBe(200);
      const { history } = res.json();
      expect(history).toHaveLength(1);
      expect(history[0].address).toBe(address);
      expect(history[0].marketId).toBe(market.id);
      expect(history[0].outcome).toBe('BALL');
      expect(history[0].result).toBe('WIN');
      expect(history[0].shares).toBe(10);
      expect(history[0].costPaid).toBe(100);
    });

    test('returns multiple settlements for user with multiple resolved bets', async () => {
      const address = '0xUser6';

      // First market - user wins
      const market1 = ctx.marketManager.createMarket(DEFAULT_TEST_GAME_ID, DEFAULT_TEST_CATEGORY_ID);
      ctx.marketManager.openMarket(market1.id);
      ctx.positionTracker.addPosition({
        address,
        marketId: market1.id,
        outcome: 'BALL',
        shares: 5,
        costPaid: 50,
        appSessionId: '0xSession2',
        appSessionVersion: 1,
        sessionStatus: 'open',
        timestamp: Date.now(),
      });
      ctx.marketManager.closeMarket(market1.id);
      ctx.marketManager.resolveMarket(market1.id, 'BALL');
      ctx.positionTracker.clearPositions(market1.id);

      // Second market - user loses
      const market2 = ctx.marketManager.createMarket(DEFAULT_TEST_GAME_ID, DEFAULT_TEST_CATEGORY_ID);
      ctx.marketManager.openMarket(market2.id);
      ctx.positionTracker.addPosition({
        address,
        marketId: market2.id,
        outcome: 'STRIKE',
        shares: 8,
        costPaid: 80,
        appSessionId: '0xSession3',
        appSessionVersion: 1,
        sessionStatus: 'open',
        timestamp: Date.now(),
      });
      ctx.marketManager.closeMarket(market2.id);
      ctx.marketManager.resolveMarket(market2.id, 'BALL'); // User bet on STRIKE, outcome is BALL
      ctx.positionTracker.clearPositions(market2.id);

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${address}/history`,
      });

      const { history } = res.json();
      expect(history).toHaveLength(2);

      // Find WIN and LOSS settlements
      const win = history.find((s: any) => s.result === 'WIN');
      const loss = history.find((s: any) => s.result === 'LOSS');

      expect(win).toBeDefined();
      expect(win.marketId).toBe(market1.id);
      expect(loss).toBeDefined();
      expect(loss.marketId).toBe(market2.id);
    });
  });

  describe('GET /api/leaderboard', () => {
    test('returns empty array when no users exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/leaderboard',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().leaderboard).toEqual([]);
    });

    test('returns users sorted by netPnl descending', async () => {
      // User 1: netPnl = 100
      const user1 = '0xUserA';
      ctx.userTracker.recordBet(user1, 100);
      ctx.userTracker.recordWin(user1, 200, 100);

      // User 2: netPnl = -50
      const user2 = '0xUserB';
      ctx.userTracker.recordBet(user2, 50);
      ctx.userTracker.recordLoss(user2, 50);

      // User 3: netPnl = 250
      const user3 = '0xUserC';
      ctx.userTracker.recordBet(user3, 150);
      ctx.userTracker.recordWin(user3, 400, 150);

      const res = await app.inject({
        method: 'GET',
        url: '/api/leaderboard',
      });

      const { leaderboard } = res.json();
      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].address).toBe(user3);
      expect(leaderboard[0].netPnl).toBe(250);
      expect(leaderboard[1].address).toBe(user1);
      expect(leaderboard[1].netPnl).toBe(100);
      expect(leaderboard[2].address).toBe(user2);
      expect(leaderboard[2].netPnl).toBe(-50);
    });

    test('respects limit parameter', async () => {
      // Create 5 users
      for (let i = 0; i < 5; i++) {
        const address = `0xUser${i}`;
        ctx.userTracker.recordBet(address, 100);
        ctx.userTracker.recordWin(address, 100 + i * 10, 100); // Different PnL for each
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/leaderboard?limit=3',
      });

      const { leaderboard } = res.json();
      expect(leaderboard).toHaveLength(3);
    });

    test('defaults to limit of 10', async () => {
      // Create 15 users
      for (let i = 0; i < 15; i++) {
        const address = `0xUser${i}`;
        ctx.userTracker.recordBet(address, 100);
        ctx.userTracker.recordWin(address, 100 + i, 100);
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/leaderboard',
      });

      const { leaderboard } = res.json();
      expect(leaderboard).toHaveLength(10);
    });

    test('returns all users when limit exceeds total users', async () => {
      // Create 3 users
      for (let i = 0; i < 3; i++) {
        const address = `0xUser${i}`;
        ctx.userTracker.recordBet(address, 100);
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/leaderboard?limit=100',
      });

      const { leaderboard } = res.json();
      expect(leaderboard).toHaveLength(3);
    });
  });
});
