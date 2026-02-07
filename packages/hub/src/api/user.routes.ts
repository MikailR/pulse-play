import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';

export function registerUserRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Params: { address: string } }>('/api/users/:address', async (req, reply) => {
    const user = ctx.userTracker.getUser(req.params.address);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    return { user };
  });

  app.get<{ Params: { address: string } }>('/api/users/:address/history', async (req) => {
    const history = ctx.userTracker.getUserHistory(req.params.address);
    return { history };
  });

  app.get<{ Querystring: { limit?: string } }>('/api/leaderboard', async (req) => {
    const limit = parseInt(req.query.limit ?? '10', 10);
    const leaderboard = ctx.userTracker.getLeaderboard(limit);
    return { leaderboard };
  });
}
