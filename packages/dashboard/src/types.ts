// Mirror of hub WsMessage and AdminState types

export type Outcome = 'BALL' | 'STRIKE';
export type MarketStatus = 'PENDING' | 'OPEN' | 'CLOSED' | 'RESOLVED';

// ── WebSocket message types ──

export interface WsOddsUpdate {
  type: 'ODDS_UPDATE';
  priceBall: number;
  priceStrike: number;
  marketId: string;
}

export interface WsMarketStatus {
  type: 'MARKET_STATUS';
  status: MarketStatus;
  marketId: string;
  outcome?: Outcome;
}

export interface WsGameState {
  type: 'GAME_STATE';
  active: boolean;
}

export interface WsBetResult {
  type: 'BET_RESULT';
  result: 'WIN' | 'LOSS';
  marketId: string;
  payout?: number;
  loss?: number;
}

export type WsMessage = WsOddsUpdate | WsMarketStatus | WsGameState | WsBetResult;

// ── Admin state response ──

export interface AdminStateResponse {
  market: {
    id: string;
    status: MarketStatus;
    outcome: Outcome | null;
    qBall: number;
    qStrike: number;
    b: number;
  } | null;
  gameState: { active: boolean };
  positionCount: number;
  connectionCount: number;
}

// ── Positions response ──

export interface Position {
  marketId: string;
  address: string;
  outcome: Outcome;
  shares: number;
  costPaid: number;
  appSessionId: string;
  timestamp: number;
}

export interface PositionsResponse {
  positions: Position[];
}

// ── Event log entry ──

export interface EventLogEntry {
  timestamp: Date;
  type: string;
  message: string;
  raw: WsMessage;
}
