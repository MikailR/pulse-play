// Outcome type (matches hub)
export type Outcome = string;

// Market status (matches hub)
export type MarketStatus = 'PENDING' | 'OPEN' | 'CLOSED' | 'RESOLVED';
export type SessionStatus = 'open' | 'settling' | 'settled';

// Game status (matches hub)
export type GameStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';

// ── Domain Models ──

export interface Sport {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
}

export interface MarketCategory {
  id: string;
  sportId: string;
  name: string;
  outcomes: string[];
  description: string | null;
  createdAt: number;
}

export interface Game {
  id: string;
  sportId: string;
  homeTeam: string;
  awayTeam: string;
  status: GameStatus;
  startedAt: number | null;
  completedAt: number | null;
  metadata: string | null;
  createdAt: number;
}

export interface UserStats {
  address: string;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  totalWagered: number;
  totalPayout: number;
  netPnl: number;
  firstSeenAt: number;
  lastActiveAt: number;
}

export interface Settlement {
  id: number;
  marketId: string;
  address: string;
  outcome: string;
  result: 'WIN' | 'LOSS';
  shares: number;
  costPaid: number;
  payout: number;
  profit: number;
  appSessionId: string;
  settledAt: number;
}

// ── Request DTOs ──

export interface BetRequest {
  address: string;
  marketId: string;
  outcome: Outcome;
  amount: number;
  appSessionId: string;
  appSessionVersion: number;
}

export interface GameStateRequest {
  active: boolean;
}

export interface MarketOpenRequest {
  gameId: string;
  categoryId: string;
}

export interface MarketCloseRequest {
  gameId?: string;
  categoryId?: string;
}

export interface OutcomeRequest {
  outcome: Outcome;
  gameId?: string;
  categoryId?: string;
}

// ── Response DTOs ──

export interface BetResponse {
  accepted: boolean;
  reason?: string;
  shares?: number;
  newPriceBall?: number;
  newPriceStrike?: number;
}

export interface MarketData {
  id: string;
  gameId: string;
  categoryId: string;
  status: MarketStatus;
  outcome: Outcome | null;
  quantities: number[];
  b: number;
  // backward compat
  qBall: number;
  qStrike: number;
}

export interface MarketResponse {
  market: MarketData | null;
  prices: number[];
  outcomes: string[];
  // backward compat
  priceBall: number;
  priceStrike: number;
}

export interface Position {
  address: string;
  marketId: string;
  outcome: Outcome;
  shares: number;
  costPaid: number;
  appSessionId: string;
  appSessionVersion: number;
  sessionStatus?: SessionStatus;
  timestamp: number;
}

export interface PositionsResponse {
  positions: Position[];
}

export interface GameStateResponse {
  success: boolean;
}

export interface MarketOpenResponse {
  success: boolean;
  marketId: string;
}

export interface MarketCloseResponse {
  success: boolean;
  marketId: string;
}

export interface OutcomeResponse {
  success: boolean;
  marketId: string;
  outcome: string;
  winners: number;
  losers: number;
  totalPayout: number;
}

export interface AdminStateResponse {
  market: MarketData | null;
  gameState: { active: boolean };
  positionCount: number;
  connectionCount: number;
  sessionCounts?: { open: number; settled: number };
  prices: number[];
  outcomes: string[];
  // backward compat
  priceBall: number;
  priceStrike: number;
}

// ── WebSocket message types ──

export interface WsOddsUpdate {
  type: 'ODDS_UPDATE';
  prices: number[];
  quantities: number[];
  outcomes: string[];
  marketId: string;
  // backward compat
  priceBall: number;
  priceStrike: number;
  qBall: number;
  qStrike: number;
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

export interface WsPositionAdded {
  type: 'POSITION_ADDED';
  position: Position;
  positionCount: number;
}

export interface WsConnectionCount {
  type: 'CONNECTION_COUNT';
  count: number;
}

export interface WsStateSync {
  type: 'STATE_SYNC';
  state: AdminStateResponse;
  positions: Position[];
}

export interface WsSessionSettled {
  type: 'SESSION_SETTLED';
  appSessionId: string;
  status: 'settled';
  address: string;
}

export type WsMessage =
  | WsOddsUpdate
  | WsMarketStatus
  | WsGameState
  | WsBetResult
  | WsPositionAdded
  | WsConnectionCount
  | WsStateSync
  | WsSessionSettled;

// ── Market Maker DTOs ──

export interface MMInfoResponse {
  address: string;
  balance: string;
}

export interface MMFaucetResponse {
  success: boolean;
  funded: number;
  requested?: number;
  error?: string;
}

// ── User Faucet DTOs ──

export interface UserFaucetResponse {
  success: boolean;
  funded: number;
  requested?: number;
  error?: string;
}
