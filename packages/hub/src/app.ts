import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import type { AppContext } from './context.js';
import { registerMarketRoutes } from './api/market.routes.js';
import { registerPositionRoutes } from './api/positions.routes.js';
import { registerBetRoutes } from './api/bet.routes.js';
import { registerOracleRoutes } from './api/oracle.routes.js';
import { registerFaucetRoutes } from './api/faucet.routes.js';
import { registerAdminRoutes } from './api/admin.routes.js';

export async function buildApp(ctx: AppContext) {
  const app = Fastify({ logger: false });

  // Enable CORS for frontend
  await app.register(cors, {
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.register(websocket);

  // WebSocket route
  app.get('/ws', { websocket: true }, (socket, req) => {
    const address = (req.query as any)?.address as string | undefined;
    ctx.ws.addConnection(socket, address);
  });

  // REST routes
  registerMarketRoutes(app, ctx);
  registerPositionRoutes(app, ctx);
  registerBetRoutes(app, ctx);
  registerOracleRoutes(app, ctx);
  registerFaucetRoutes(app, ctx);
  registerAdminRoutes(app, ctx);

  return app;
}
