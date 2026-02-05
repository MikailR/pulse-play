# PulsePlay Developer Dashboard

A terminal-based real-time developer dashboard for observing the PulsePlay hub backend. Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLI).

## Features

- Real-time WebSocket event log
- Market state display with LMSR odds
- Position tracking
- System status (connections, game state)
- Auto-reconnect on connection loss

## Installation

```bash
# From monorepo root
pnpm install
```

## Usage

### Development

```bash
# Start the hub first (in another terminal)
cd packages/hub && pnpm dev

# Then start the dashboard
cd packages/dashboard && pnpm dev
```

### With Custom Hub URL

```bash
# Connect to a different hub instance
pnpm dev http://localhost:3002

# Or a remote server
pnpm dev http://192.168.1.100:3001
```

### Help

```bash
pnpm dev --help
```

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│               PULSEPLAY DEVELOPER DASHBOARD  | Press 'q' to quit   │
├─────────────────────────────────┬───────────────────────────────────┤
│  ┌────── MARKET: market-3 ────┐ │  ┌─────────── SYSTEM ───────────┐ │
│  │ Status: OPEN               │ │  │ WS: Connected                │ │
│  │ BALL:   45.2% (-122)       │ │  │ API: OK                      │ │
│  │ STRIKE: 54.8% (+122)       │ │  │ Clients: 2                   │ │
│  └────────────────────────────┘ │  │ Game: ACTIVE                 │ │
│  ┌────── POSITIONS (2) ───────┐ │  └──────────────────────────────┘ │
│  │ 0x1234.. BALL   12.50 $5   │ │  ┌──────── EVENT LOG ───────────┐ │
│  │ 0x5678.. STRIKE  8.30 $4   │ │  │ 14:32:15 [GAME_STATE] ACTIVE │ │
│  └────────────────────────────┘ │  │ 14:32:18 [MARKET] -> OPEN    │ │
│                                 │  │ 14:32:22 [ODDS] Ball: 48.1%  │ │
│                                 │  └──────────────────────────────┘ │
└─────────────────────────────────┴───────────────────────────────────┘
```

## Controls

| Key | Action |
|-----|--------|
| `q` | Quit the dashboard |

## Event Types

| Type | Description |
|------|-------------|
| `ODDS_UPDATE` | Market odds changed after a bet |
| `MARKET_STATUS` | Market state changed (PENDING → OPEN → CLOSED → RESOLVED) |
| `GAME_STATE` | Game activated or deactivated |
| `BET_RESULT` | Bettor received win/loss notification |

## Architecture

The dashboard runs as a separate process and connects to the hub via:

1. **WebSocket** (`ws://host:port/ws`) - Real-time event streaming
2. **REST API** (`http://host:port/api/admin/state`) - Polling for system state

This separation means the dashboard can be started/stopped without affecting the hub.

## Testing

```bash
pnpm test
```

## Building

```bash
pnpm build
```

After building, you can run with Node directly:

```bash
node dist/index.js
```
