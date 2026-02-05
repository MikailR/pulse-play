import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import type { BetRequest, BetResponse } from './types.js';
import { getPrice, getShares, getNewQuantities } from '../modules/lmsr/engine.js';

export function registerBetRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post<{ Body: BetRequest }>('/api/bet', async (req, reply) => {
    const { address, marketId, outcome, amount, appSessionId } = req.body ?? {} as any;

    // Validate required fields
    if (!address || !marketId || !outcome || amount === undefined || !appSessionId) {
      return reply.status(400).send({ accepted: false, reason: 'Missing required fields' });
    }

    // Validate outcome
    if (outcome !== 'BALL' && outcome !== 'STRIKE') {
      return reply.status(400).send({ accepted: false, reason: 'Invalid outcome' });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return reply.status(400).send({ accepted: false, reason: 'Amount must be positive' });
    }

    // Check market exists and is OPEN
    const market = ctx.marketManager.getMarket(marketId);
    if (!market || market.status !== 'OPEN') {
      const reason = !market ? 'Market not found' : `Market is ${market.status}`;
      return { accepted: false, reason } as BetResponse;
    }

    // Calculate shares from LMSR
    const shares = getShares(market.qBall, market.qStrike, market.b, outcome, amount);
    const { qBall, qStrike } = getNewQuantities(market.qBall, market.qStrike, outcome, shares);

    // Update market quantities
    ctx.marketManager.updateQuantities(marketId, qBall, qStrike);

    // Record position
    ctx.positionTracker.addPosition({
      address,
      marketId,
      outcome,
      shares,
      costPaid: amount,
      appSessionId,
      timestamp: Date.now(),
    });

    // Compute new prices
    const newPriceBall = getPrice(qBall, qStrike, market.b, 'BALL');
    const newPriceStrike = getPrice(qBall, qStrike, market.b, 'STRIKE');

    // Broadcast odds update
    ctx.ws.broadcast({
      type: 'ODDS_UPDATE',
      priceBall: newPriceBall,
      priceStrike: newPriceStrike,
      marketId,
    });

    return {
      accepted: true,
      shares,
      newPriceBall,
      newPriceStrike,
    } as BetResponse;
  });
}
