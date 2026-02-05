import { buildApp } from './app.js';
import { MarketManager } from './modules/market/manager.js';
import { PositionTracker } from './modules/position/tracker.js';
import { ClearnodeClient } from './modules/clearnode/client.js';
import { OracleService } from './modules/oracle/oracle.js';
import { WsManager } from './api/ws.js';
import type { AppContext } from './context.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main() {
  const clearnodeClient = new ClearnodeClient({
    url: process.env.CLEARNODE_URL ?? 'wss://clearnode.yellow.com/ws',
    mmPrivateKey: (process.env.MM_PRIVATE_KEY ?? '0x') as `0x${string}`,
    application: process.env.APP_ADDRESS ?? '0x',
    allowances: [],
    faucetUrl: process.env.FAUCET_URL ?? 'https://faucet.yellow.com',
  });

  const ctx: AppContext = {
    marketManager: new MarketManager(),
    positionTracker: new PositionTracker(),
    clearnodeClient,
    oracle: new OracleService(),
    ws: new WsManager(),
  };

  const app = await buildApp(ctx);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`PulsePlay Hub listening on port ${PORT}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
