import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import type { GameStatus } from '../modules/game/types.js';

export function registerGameRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Querystring: { sportId?: string; status?: string } }>('/api/games', async (req) => {
    const { sportId, status } = req.query;

    let games;
    if (sportId) {
      games = ctx.gameManager.getGamesBySport(sportId);
    } else if (status) {
      games = ctx.gameManager.getAllGames(status as GameStatus);
    } else {
      games = ctx.gameManager.getAllGames();
    }

    return { games };
  });

  app.post<{ Body: { sportId?: string; homeTeam?: string; awayTeam?: string; id?: string } }>(
    '/api/games',
    async (req, reply) => {
      const { sportId, homeTeam, awayTeam, id } = req.body ?? {} as any;
      if (!sportId || !homeTeam || !awayTeam) {
        return reply.status(400).send({ error: 'sportId, homeTeam, and awayTeam are required' });
      }

      try {
        const game = ctx.gameManager.createGame(sportId, homeTeam, awayTeam, id);
        return { success: true, game };
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.get<{ Params: { gameId: string } }>('/api/games/:gameId', async (req, reply) => {
    const game = ctx.gameManager.getGame(req.params.gameId);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const markets = ctx.marketManager.getMarketsByGame(game.id);
    return { game, markets };
  });

  app.post<{ Params: { gameId: string } }>('/api/games/:gameId/activate', async (req, reply) => {
    try {
      const game = ctx.gameManager.activateGame(req.params.gameId);
      return { success: true, game };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.post<{ Params: { gameId: string } }>('/api/games/:gameId/complete', async (req, reply) => {
    try {
      const game = ctx.gameManager.completeGame(req.params.gameId);
      return { success: true, game };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
