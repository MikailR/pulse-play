import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import type { FaucetRequest } from './types.js';

export function registerFaucetRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post<{ Body: FaucetRequest }>('/api/faucet/user', async (req, reply) => {
    const { address, amount } = req.body ?? {} as any;

    if (!address) {
      return reply.status(400).send({ error: 'address is required' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return reply.status(400).send({ error: 'amount must be a positive number' });
    }

    // Stub: user funding happens frontend-side via Clearnode
    return { success: true, address, amount };
  });

  app.post('/api/faucet/mm', async (_req, reply) => {
    try {
      await ctx.clearnodeClient.requestFaucet();
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message ?? 'Faucet request failed' });
    }
  });
}
