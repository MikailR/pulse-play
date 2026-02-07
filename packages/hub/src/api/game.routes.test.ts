import { buildApp } from '../app.js';
import { createTestContext, DEFAULT_TEST_GAME_ID } from '../context.js';
import type { AppContext } from '../context.js';
import type { FastifyInstance } from 'fastify';

describe('Game Routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createTestContext();
    app = await buildApp(ctx);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/games', () => {
    test('returns all games including the default test game', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/games' });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.games).toBeInstanceOf(Array);
      expect(body.games.length).toBeGreaterThanOrEqual(1);

      const testGame = body.games.find((g: any) => g.id === DEFAULT_TEST_GAME_ID);
      expect(testGame).toBeDefined();
      expect(testGame.sportId).toBe('baseball');
      expect(testGame.homeTeam).toBe('NYY');
      expect(testGame.awayTeam).toBe('BOS');
      expect(testGame.status).toBe('ACTIVE');
    });

    test('filters games by sportId', async () => {
      // Create games with different sports
      ctx.gameManager.createGame('basketball', 'LAL', 'BOS', 'bball-1');
      ctx.gameManager.createGame('baseball', 'SF', 'LAD', 'baseball-1');

      const res = await app.inject({
        method: 'GET',
        url: '/api/games?sportId=baseball'
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.games).toBeInstanceOf(Array);

      // All returned games should be baseball
      body.games.forEach((game: any) => {
        expect(game.sportId).toBe('baseball');
      });

      // Should include at least the default test game and the one we just created
      expect(body.games.length).toBeGreaterThanOrEqual(2);
    });

    test('filters games by status', async () => {
      // Create games with different statuses
      const scheduled = ctx.gameManager.createGame('baseball', 'CHC', 'STL', 'scheduled-1');
      const active = ctx.gameManager.createGame('baseball', 'ATL', 'MIA', 'active-1');
      ctx.gameManager.activateGame(active.id);

      const res = await app.inject({
        method: 'GET',
        url: '/api/games?status=SCHEDULED'
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.games).toBeInstanceOf(Array);

      // All returned games should be SCHEDULED
      body.games.forEach((game: any) => {
        expect(game.status).toBe('SCHEDULED');
      });

      // Should include the scheduled game
      const foundScheduled = body.games.find((g: any) => g.id === scheduled.id);
      expect(foundScheduled).toBeDefined();
    });
  });

  describe('POST /api/games', () => {
    test('creates a new game with auto-generated ID', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/games',
        payload: {
          sportId: 'basketball',
          homeTeam: 'KC',
          awayTeam: 'SF',
        },
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.game).toBeDefined();
      expect(body.game.sportId).toBe('basketball');
      expect(body.game.homeTeam).toBe('KC');
      expect(body.game.awayTeam).toBe('SF');
      expect(body.game.status).toBe('SCHEDULED');
      expect(body.game.id).toBeDefined();
      expect(body.game.createdAt).toBeDefined();
    });

    test('creates a new game with custom ID', async () => {
      const customId = 'my-custom-game-id';
      const res = await app.inject({
        method: 'POST',
        url: '/api/games',
        payload: {
          sportId: 'soccer',
          homeTeam: 'BOS',
          awayTeam: 'NYR',
          id: customId,
        },
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.game.id).toBe(customId);
      expect(body.game.sportId).toBe('soccer');
      expect(body.game.homeTeam).toBe('BOS');
      expect(body.game.awayTeam).toBe('NYR');
      expect(body.game.status).toBe('SCHEDULED');
    });

    test('returns 400 when sportId is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/games',
        payload: {
          homeTeam: 'KC',
          awayTeam: 'SF',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('sportId, homeTeam, and awayTeam are required');
    });

    test('returns 400 when homeTeam is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/games',
        payload: {
          sportId: 'basketball',
          awayTeam: 'SF',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('sportId, homeTeam, and awayTeam are required');
    });

    test('returns 400 when awayTeam is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/games',
        payload: {
          sportId: 'basketball',
          homeTeam: 'KC',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('sportId, homeTeam, and awayTeam are required');
    });

    test('returns 400 when body is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/games',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('sportId, homeTeam, and awayTeam are required');
    });
  });

  describe('GET /api/games/:gameId', () => {
    test('returns game with markets when game exists', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/games/${DEFAULT_TEST_GAME_ID}`
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.game).toBeDefined();
      expect(body.game.id).toBe(DEFAULT_TEST_GAME_ID);
      expect(body.game.sportId).toBe('baseball');
      expect(body.game.homeTeam).toBe('NYY');
      expect(body.game.awayTeam).toBe('BOS');
      expect(body.markets).toBeDefined();
      expect(body.markets).toBeInstanceOf(Array);
    });

    test('returns 404 for non-existent game', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/games/non-existent-game-id'
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe('Game not found');
    });

    test('includes markets when they exist for the game', async () => {
      // Create markets for the test game (using 'pitching' and 'batting' which are seeded for baseball)
      const market1 = ctx.marketManager.createMarket(DEFAULT_TEST_GAME_ID, 'pitching');
      const market2 = ctx.marketManager.createMarket(DEFAULT_TEST_GAME_ID, 'batting');

      const res = await app.inject({
        method: 'GET',
        url: `/api/games/${DEFAULT_TEST_GAME_ID}`
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.markets).toBeInstanceOf(Array);
      expect(body.markets.length).toBeGreaterThanOrEqual(2);

      const foundMarket1 = body.markets.find((m: any) => m.id === market1.id);
      const foundMarket2 = body.markets.find((m: any) => m.id === market2.id);
      expect(foundMarket1).toBeDefined();
      expect(foundMarket2).toBeDefined();
    });

    test('returns empty markets array when game has no markets', async () => {
      const game = ctx.gameManager.createGame('soccer', 'MAN', 'LIV', 'soccer-1');

      const res = await app.inject({
        method: 'GET',
        url: `/api/games/${game.id}`
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.game.id).toBe(game.id);
      expect(body.markets).toBeInstanceOf(Array);
      expect(body.markets.length).toBe(0);
    });
  });

  describe('POST /api/games/:gameId/activate', () => {
    test('activates a SCHEDULED game', async () => {
      const game = ctx.gameManager.createGame('baseball', 'TEX', 'HOU', 'scheduled-game');

      expect(game.status).toBe('SCHEDULED');
      expect(game.startedAt).toBeNull();

      const res = await app.inject({
        method: 'POST',
        url: `/api/games/${game.id}/activate`,
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.game.status).toBe('ACTIVE');
      expect(body.game.startedAt).toBeDefined();
      expect(body.game.startedAt).not.toBeNull();
    });

    test('returns 400 when trying to activate an already active game', async () => {
      // DEFAULT_TEST_GAME_ID is already ACTIVE
      const res = await app.inject({
        method: 'POST',
        url: `/api/games/${DEFAULT_TEST_GAME_ID}/activate`,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain('Cannot activate game');
      expect(res.json().error).toContain('ACTIVE');
    });

    test('returns 400 when trying to activate a completed game', async () => {
      const game = ctx.gameManager.createGame('baseball', 'ARI', 'SD', 'completed-game');
      ctx.gameManager.activateGame(game.id);
      ctx.gameManager.completeGame(game.id);

      const res = await app.inject({
        method: 'POST',
        url: `/api/games/${game.id}/activate`,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain('Cannot activate game');
      expect(res.json().error).toContain('COMPLETED');
    });
  });

  describe('POST /api/games/:gameId/complete', () => {
    test('completes an ACTIVE game', async () => {
      const game = ctx.gameManager.createGame('baseball', 'OAK', 'SEA', 'active-game');
      ctx.gameManager.activateGame(game.id);

      const activatedGame = ctx.gameManager.getGame(game.id);
      expect(activatedGame?.status).toBe('ACTIVE');
      expect(activatedGame?.completedAt).toBeNull();

      const res = await app.inject({
        method: 'POST',
        url: `/api/games/${game.id}/complete`,
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.game.status).toBe('COMPLETED');
      expect(body.game.completedAt).toBeDefined();
      expect(body.game.completedAt).not.toBeNull();
    });

    test('returns 400 when trying to complete a SCHEDULED game', async () => {
      const game = ctx.gameManager.createGame('baseball', 'MIN', 'CLE', 'scheduled-game-2');

      const res = await app.inject({
        method: 'POST',
        url: `/api/games/${game.id}/complete`,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain('Cannot complete game');
      expect(res.json().error).toContain('SCHEDULED');
    });

    test('returns 400 when trying to complete an already completed game', async () => {
      const game = ctx.gameManager.createGame('baseball', 'DET', 'CWS', 'completed-game-2');
      ctx.gameManager.activateGame(game.id);
      ctx.gameManager.completeGame(game.id);

      const res = await app.inject({
        method: 'POST',
        url: `/api/games/${game.id}/complete`,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain('Cannot complete game');
      expect(res.json().error).toContain('COMPLETED');
    });
  });
});
