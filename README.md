# PulsePlay

A decentralized micro-prediction platform for real-time play-by-play sports betting with ultra-short outcome windows (10-30 seconds). Built on [Yellow Network](https://yellow.org)'s ClearNode state channel infrastructure for instant, gasless off-chain bet placement and resolution.

**Key innovations:**
- **State-channel micro-betting** — sub-second bet placement via Yellow Network payment channels, no gas fees per bet
- **Dual market modes** — LMSR automated market making + P2P Central Limit Order Book (CLOB)
- **LP pools** — liquidity providers deposit USDC and receive tokenized shares as the distributed counterparty to all LMSR bets
- **Terminal simulator** — fully interactive Ink-based TUI for demos and testing without a browser

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces |
| Backend | Fastify 5, TypeScript, SQLite (better-sqlite3), Drizzle ORM |
| Frontend | Next.js 14, React 18, TailwindCSS, wagmi, viem |
| Simulator | Ink 4 (React terminal UI), chalk |
| State Channels | Yellow Network / @erc7824/nitrolite |
| Market Making | LMSR engine (custom), CLOB order book |

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** (latest)
- **C++ build toolchain** — required by native dependencies (`better-sqlite3`, `esbuild`, `unrs-resolver`)
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
  - **Linux:** `build-essential` (`sudo apt install build-essential`)
  - **Windows:** `windows-build-tools` (`npm install -g windows-build-tools`)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd pulse-play
pnpm install
```

### 2. Configure the hub

Create `packages/hub/.env` (gitignored — must be created manually):

```env
CLEARNODE_URL=wss://clearnet-sandbox.yellow.com/ws
MM_PRIVATE_KEY=0x<your-market-maker-private-key>
APPLICATION_NAME=pulse-play
FAUCET_URL=https://clearnet-sandbox.yellow.com/faucet/requestTokens
```

See [Hub Environment Variables](#hub-environment-variables) for the full reference.

### 3. Configure the frontend

```bash
cp packages/frontend/.env.local.example packages/frontend/.env.local
```

Edit `packages/frontend/.env.local` and set:
- `NEXT_PUBLIC_MM_ADDRESS` — the Ethereum address derived from your `MM_PRIVATE_KEY`
- `NEXT_PUBLIC_WALLET_MODE` — `metamask` (browser extension) or `private-key` (test key)
- `NEXT_PUBLIC_PRIVATE_KEY` — a test wallet private key (only used in `private-key` mode)

### 4. Start the hub

```bash
cd packages/hub
pnpm dev
```

The hub starts on **port 3001** by default. It auto-seeds sports, categories, and teams on startup.

### 5. Seed team logos

While the hub is running (in a separate terminal):

```bash
cd packages/hub
pnpm seed:logos
```

This uploads team logo images to the hub's static file server.

### 6. Start the frontend

```bash
cd packages/frontend
pnpm dev
```

The frontend starts on **port 3000** by default.

### 7. Start the simulator (optional)

```bash
cd packages/simulator
pnpm dev [hubUrl] [clearnodeUrl]
```

Defaults: `http://localhost:3001` and `wss://clearnet-sandbox.yellow.com/ws`

## Environment Variables

### Hub Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP server port |
| `DB_PATH` | `../data/pulseplay.db` | SQLite database file path (relative to `src/`) |
| `CLEARNODE_URL` | `wss://clearnode.yellow.com/ws` | Yellow Network ClearNode WebSocket URL |
| `MM_PRIVATE_KEY` | `0x` | Market maker wallet private key (ECDSA) |
| `APPLICATION_NAME` | `0x` | Application identifier for ClearNode auth |
| `FAUCET_URL` | `https://faucet.yellow.com` | Sandbox faucet endpoint for test tokens |
| `TRANSACTION_FEE_PERCENT` | `1` | Fee percentage applied to bets |
| `LMSR_SENSITIVITY_FACTOR` | `0.01` | LMSR liquidity parameter (b) sensitivity |

### Frontend Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_HUB_REST_URL` | Hub REST API URL (default: `http://localhost:3001`) |
| `NEXT_PUBLIC_HUB_WS_URL` | Hub WebSocket URL (default: `ws://localhost:3001/ws`) |
| `NEXT_PUBLIC_CLEARNODE_URL` | Yellow Network ClearNode WebSocket URL |
| `NEXT_PUBLIC_WALLET_MODE` | `metamask` or `private-key` |
| `NEXT_PUBLIC_PRIVATE_KEY` | Test wallet private key (for `private-key` mode only) |
| `NEXT_PUBLIC_MM_ADDRESS` | Market maker Ethereum address (must match hub's `MM_PRIVATE_KEY`) |

## Available Commands

### Root

| Command | Description |
|---------|-------------|
| `pnpm test` | Run tests across all packages |
| `pnpm build` | Build all packages |

### packages/hub

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the hub server (tsx) |
| `pnpm build` | Compile TypeScript |
| `pnpm test` | Run Jest test suites |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm seed:logos` | Upload team logos (hub must be running) |

### packages/frontend

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Jest test suites |
| `pnpm test:watch` | Run tests in watch mode |

### packages/simulator

| Command | Description |
|---------|-------------|
| `pnpm dev` | Launch the terminal simulator |
| `pnpm build` | Compile TypeScript |
| `pnpm test` | Run Jest test suites |
| `pnpm test:watch` | Run tests in watch mode |

## Simulator

The simulator is a terminal-based (Ink/React) interactive UI for running PulsePlay demos without a browser. It connects to the hub and ClearNode, manages wallets, and can run automated betting simulations.

### Quick start

```bash
cd packages/simulator
pnpm dev
```

### Key commands

| Command | Description |
|---------|-------------|
| `:wallets` | Generate test wallets |
| `:fund` | Request faucet tokens for all wallets |
| `:open` | Open a game session |
| `:close` | Close the active game session |
| `:resolve <outcome>` | Resolve the current market |
| `:sim start` | Start automated betting simulation |
| `:sim stop` | Stop the simulation |
| `:p2p` | Toggle P2P order book mode |
| `:status` | Show current system status |
| `:reset` | Reset simulator state |
| `:clear` | Clear the terminal log |
| `q` | Quit the simulator |

### Navigation

| Key | Action |
|-----|--------|
| `Tab` | Cycle between panels |
| `j` / `k` | Scroll up/down |
| `g` / `G` | Jump to top/bottom |
| `?` | Show help |
| `:` | Enter command mode |

See [`packages/simulator/README.md`](packages/simulator/README.md) for the full command reference, demo walkthrough, and simulation configuration options.

## Project Structure

```
pulse-play/
├── packages/
│   ├── hub/              # Backend — Fastify API, LMSR engine, market manager,
│   │                     #   order book, LP pools, ClearNode integration, SQLite
│   ├── frontend/         # Next.js 14 web app — wagmi wallet, live odds, betting UI
│   └── simulator/        # Ink terminal UI — demo simulator, automated betting
├── package.json          # Root workspace config
├── pnpm-workspace.yaml   # pnpm workspace + native dependency allowlist
├── tsconfig.base.json    # Shared TypeScript config
└── PROJECT_SPECIFICATION.md  # Canonical product specification
```

## Testing

Run all tests from the repo root:

```bash
pnpm test
```

Or run tests for a specific package:

```bash
cd packages/hub && pnpm test
cd packages/frontend && pnpm test
cd packages/simulator && pnpm test
```

For hub tests, use `--maxWorkers=2` if you experience timeout flakiness:

```bash
cd packages/hub
pnpm test -- --maxWorkers=2
```

Watch mode is available in all packages:

```bash
pnpm test:watch
```
