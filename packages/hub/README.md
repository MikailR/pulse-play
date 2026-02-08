# @pulse-play/hub

The hub server is the central backend for PulsePlay. It manages games, teams, bets, oracle feeds, and user state via a Fastify HTTP/WebSocket server backed by SQLite.

## Prerequisites

- Node.js >= 18
- pnpm

## Getting Started

```bash
# Install dependencies (from repo root)
pnpm install

# Start the dev server (default: http://localhost:3001)
pnpm --filter @pulse-play/hub dev
```

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start the hub server with hot reload via tsx |
| `pnpm build` | Compile TypeScript |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm seed:logos` | Upload all seed team logos to the running hub (see below) |

## Seeding Team Logos

Team logo images are stored in `src/db/seed_team_logos/`, organized by sport and named by team ID (e.g. `baseball/nyy.png`).

To upload them all to a running hub server:

```bash
# Default target: http://localhost:3001
pnpm --filter @pulse-play/hub seed:logos

# Custom target
pnpm --filter @pulse-play/hub seed:logos http://localhost:3001
```

The script POSTs each image to `POST /api/teams/:teamId/logo` and reports success/failure per team.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP server port |
| `DB_PATH` | `./data/pulseplay.db` | SQLite database file path |
| `CLEARNODE_URL` | `wss://clearnode.yellow.com/ws` | ClearNode WebSocket URL |
| `MM_PRIVATE_KEY` | — | Market maker private key |
| `APPLICATION_NAME` | — | Yellow Network application name |
| `FAUCET_URL` | `https://faucet.yellow.com` | Yellow Network faucet URL |
| `TRANSACTION_FEE_PERCENT` | `1` | Fee percentage on transactions |
