import { buildApp } from '../app.js';
import { createTestContext } from '../context.js';
import type { AppContext } from '../context.js';
import type { FastifyInstance } from 'fastify';

describe('Team Routes', () => {
  let app: FastifyInstance;
  let ctx: AppContext;

  beforeEach(async () => {
    ctx = createTestContext();
    app = await buildApp(ctx);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/teams', () => {
    test('returns all seeded teams', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/teams' });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.teams).toBeInstanceOf(Array);
      expect(body.teams.length).toBe(18); // 6 per sport × 3 sports
    });

    test('filters teams by sportId', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/teams?sportId=baseball' });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.teams).toHaveLength(6);
      body.teams.forEach((t: any) => expect(t.sportId).toBe('baseball'));
    });
  });

  describe('GET /api/teams/:teamId', () => {
    test('returns a single team', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/teams/nyy' });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.team.id).toBe('nyy');
      expect(body.team.name).toBe('New York Yankees');
      expect(body.team.abbreviation).toBe('NYY');
    });

    test('returns 404 for nonexistent team', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/teams/nonexistent' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/teams', () => {
    test('creates a new team', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/teams',
        payload: { sportId: 'baseball', name: 'Test Team', abbreviation: 'TST', id: 'tst' },
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.team.id).toBe('tst');
      expect(body.team.name).toBe('Test Team');
    });

    test('returns 400 when required fields missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/teams',
        payload: { sportId: 'baseball', name: 'No Abbrev' },
      });
      expect(res.statusCode).toBe(400);
    });

    test('returns 400 for nonexistent sport', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/teams',
        payload: { sportId: 'cricket', name: 'Bad', abbreviation: 'BAD' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /api/teams/:teamId', () => {
    test('updates team name', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/teams/nyy',
        payload: { name: 'Updated Yankees' },
      });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.team.name).toBe('Updated Yankees');
      expect(body.team.abbreviation).toBe('NYY'); // unchanged
    });

    test('returns 404 for nonexistent team', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/teams/nonexistent',
        payload: { name: 'X' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/teams/:teamId', () => {
    test('deletes a team with no game references', async () => {
      // Create a new team that's not referenced
      ctx.teamManager.createTeam({ sportId: 'baseball', name: 'Temp', abbreviation: 'TMP', id: 'tmp' });

      const res = await app.inject({ method: 'DELETE', url: '/api/teams/tmp' });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    test('returns 409 when team is referenced by games', async () => {
      // nyy is referenced by the default test game
      const res = await app.inject({ method: 'DELETE', url: '/api/teams/nyy' });
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toContain('referenced by');
    });

    test('returns 404 for nonexistent team', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/teams/nonexistent' });
      expect(res.statusCode).toBe(404);
    });
  });
});
