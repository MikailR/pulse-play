import { buildApp } from '../app.js';
import { createTestContext } from '../context.js';
import type { AppContext } from '../context.js';
import type { FastifyInstance } from 'fastify';

describe('Sport Routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createTestContext();
    app = await buildApp(ctx);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/sports', () => {
    test('returns all seeded sports', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/sports' });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.sports).toHaveLength(3);

      const sportIds = body.sports.map((s: any) => s.id).sort();
      expect(sportIds).toEqual(['baseball', 'basketball', 'soccer']);
    });

    test('sports have expected fields', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/sports' });
      const body = res.json();

      const baseball = body.sports.find((s: any) => s.id === 'baseball');
      expect(baseball).toBeDefined();
      expect(baseball.id).toBe('baseball');
      expect(baseball.name).toBe('Baseball');
      expect(baseball.description).toBe('Major League Baseball');
      expect(typeof baseball.createdAt).toBe('number');
      expect(baseball.createdAt).toBeGreaterThan(0);
    });
  });

  describe('GET /api/sports/:sportId/categories', () => {
    test('returns categories for baseball (pitching + batting)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/sports/baseball/categories'
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.sportId).toBe('baseball');
      expect(body.categories).toHaveLength(2);

      const categoryIds = body.categories.map((c: any) => c.id).sort();
      expect(categoryIds).toEqual(['batting', 'pitching']);
    });

    test('categories have expected fields', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/sports/baseball/categories'
      });
      const body = res.json();

      const pitching = body.categories.find((c: any) => c.id === 'pitching');
      expect(pitching).toBeDefined();
      expect(pitching.id).toBe('pitching');
      expect(pitching.sportId).toBe('baseball');
      expect(pitching.name).toBe('Pitching');
      expect(pitching.outcomes).toEqual(['BALL', 'STRIKE']);
      expect(pitching.description).toBe('Ball vs Strike on each pitch');
      expect(typeof pitching.createdAt).toBe('number');
      expect(pitching.createdAt).toBeGreaterThan(0);
    });

    test('returns categories for basketball (free_throw + three_pointer)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/sports/basketball/categories'
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.sportId).toBe('basketball');
      expect(body.categories).toHaveLength(2);

      const categoryIds = body.categories.map((c: any) => c.id).sort();
      expect(categoryIds).toEqual(['free_throw', 'three_pointer']);

      const freeThrow = body.categories.find((c: any) => c.id === 'free_throw');
      expect(freeThrow.outcomes).toEqual(['MAKE', 'MISS']);

      const threePointer = body.categories.find((c: any) => c.id === 'three_pointer');
      expect(threePointer.outcomes).toEqual(['MAKE', 'MISS']);
    });

    test('returns single category for soccer (penalty)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/sports/soccer/categories'
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.sportId).toBe('soccer');
      expect(body.categories).toHaveLength(1);

      const penalty = body.categories[0];
      expect(penalty.id).toBe('penalty');
      expect(penalty.name).toBe('Penalty Kick');
      expect(penalty.outcomes).toEqual(['GOAL', 'SAVE']);
      expect(penalty.description).toBe('Goal vs Save on penalty kicks');
    });

    test('returns 404 for non-existent sport', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/sports/cricket/categories'
      });

      expect(res.statusCode).toBe(404);

      const body = res.json();
      expect(body.error).toBe("Sport 'cricket' not found");
    });

    test('returns empty categories array for sport with no categories', async () => {
      // Insert a sport with no categories
      const { sports } = await import('../db/schema.js');
      ctx.db.insert(sports).values({
        id: 'tennis',
        name: 'Tennis',
        description: 'Professional Tennis',
        createdAt: Date.now(),
      }).run();

      const res = await app.inject({
        method: 'GET',
        url: '/api/sports/tennis/categories'
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.sportId).toBe('tennis');
      expect(body.categories).toHaveLength(0);
      expect(body.categories).toEqual([]);
    });
  });
});
