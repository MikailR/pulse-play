import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { getPrice } from '../modules/lmsr/engine.js';

export function registerMarketRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/api/market', async () => {
    const market = ctx.marketManager.getCurrentMarket();
    if (!market) {
      return { market: null, priceBall: 0.5, priceStrike: 0.5 };
    }
    return {
      market: {
        id: market.id,
        status: market.status,
        outcome: market.outcome,
        qBall: market.qBall,
        qStrike: market.qStrike,
        b: market.b,
      },
      priceBall: getPrice(market.qBall, market.qStrike, market.b, 'BALL'),
      priceStrike: getPrice(market.qBall, market.qStrike, market.b, 'STRIKE'),
    };
  });

  app.get<{ Params: { marketId: string } }>('/api/market/:marketId', async (req, reply) => {
    const market = ctx.marketManager.getMarket(req.params.marketId);
    if (!market) {
      return reply.status(404).send({ error: 'Market not found' });
    }
    return {
      market: {
        id: market.id,
        status: market.status,
        outcome: market.outcome,
        qBall: market.qBall,
        qStrike: market.qStrike,
        b: market.b,
      },
      priceBall: getPrice(market.qBall, market.qStrike, market.b, 'BALL'),
      priceStrike: getPrice(market.qBall, market.qStrike, market.b, 'STRIKE'),
    };
  });
}
