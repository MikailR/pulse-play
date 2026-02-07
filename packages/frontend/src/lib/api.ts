import { HUB_REST_URL } from './config';
import type {
  BetRequest,
  BetResponse,
  MarketResponse,
  PositionsResponse,
  GameStateRequest,
  GameStateResponse,
  MarketOpenRequest,
  MarketOpenResponse,
  MarketCloseRequest,
  MarketCloseResponse,
  OutcomeRequest,
  OutcomeResponse,
  AdminStateResponse,
  MMInfoResponse,
  MMFaucetResponse,
  UserFaucetResponse,
  Sport,
  MarketCategory,
  Game,
  UserStats,
  Settlement,
  Position,
} from './types';

// API Error class
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper to handle responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || response.statusText);
  }
  return response.json() as Promise<T>;
}

// ── Bettor Endpoints ──

export async function placeBet(request: BetRequest): Promise<BetResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/bet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<BetResponse>(response);
}

export async function getMarket(): Promise<MarketResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/market`);
  return handleResponse<MarketResponse>(response);
}

export async function getMarketById(marketId: string): Promise<MarketResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/market/${marketId}`);
  return handleResponse<MarketResponse>(response);
}

export async function getPositions(address: string): Promise<PositionsResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/positions/${address}`);
  return handleResponse<PositionsResponse>(response);
}

// ── Sport & Category Endpoints ──

export async function getSports(): Promise<{ sports: Sport[] }> {
  const response = await fetch(`${HUB_REST_URL}/api/sports`);
  return handleResponse(response);
}

export async function getSportCategories(sportId: string): Promise<{ sportId: string; categories: MarketCategory[] }> {
  const response = await fetch(`${HUB_REST_URL}/api/sports/${sportId}/categories`);
  return handleResponse(response);
}

// ── Game Endpoints ──

export async function getGames(filters?: { sportId?: string; status?: string }): Promise<{ games: Game[] }> {
  const params = new URLSearchParams();
  if (filters?.sportId) params.set('sportId', filters.sportId);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  const response = await fetch(`${HUB_REST_URL}/api/games${qs ? `?${qs}` : ''}`);
  return handleResponse(response);
}

export async function getGame(gameId: string): Promise<{ game: Game; markets: MarketResponse['market'][] }> {
  const response = await fetch(`${HUB_REST_URL}/api/games/${gameId}`);
  return handleResponse(response);
}

export async function createGame(
  sportId: string,
  homeTeam: string,
  awayTeam: string,
  id?: string
): Promise<{ success: boolean; game: Game }> {
  const response = await fetch(`${HUB_REST_URL}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sportId, homeTeam, awayTeam, id }),
  });
  return handleResponse(response);
}

export async function activateGame(
  gameId: string
): Promise<{ success: boolean; game: Game }> {
  const response = await fetch(`${HUB_REST_URL}/api/games/${gameId}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return handleResponse(response);
}

export async function completeGame(
  gameId: string
): Promise<{ success: boolean; game: Game }> {
  const response = await fetch(`${HUB_REST_URL}/api/games/${gameId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return handleResponse(response);
}

// ── Oracle Endpoints ──

export async function setGameState(
  request: GameStateRequest
): Promise<GameStateResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/oracle/game-state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<GameStateResponse>(response);
}

export async function openMarket(
  request: MarketOpenRequest
): Promise<MarketOpenResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/oracle/market/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<MarketOpenResponse>(response);
}

export async function closeMarket(
  request?: MarketCloseRequest
): Promise<MarketCloseResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/oracle/market/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request ?? {}),
  });
  return handleResponse<MarketCloseResponse>(response);
}

export async function resolveOutcome(
  request: OutcomeRequest
): Promise<OutcomeResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/oracle/outcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<OutcomeResponse>(response);
}

// ── Admin Endpoints ──

export async function getAdminState(): Promise<AdminStateResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/admin/state`);
  return handleResponse<AdminStateResponse>(response);
}

export async function getAdminPositions(marketId: string): Promise<{ positions: Position[] }> {
  const response = await fetch(`${HUB_REST_URL}/api/admin/positions/${marketId}`);
  return handleResponse(response);
}

// ── User Endpoints ──

export async function getUserStats(address: string): Promise<{ user: UserStats }> {
  const response = await fetch(`${HUB_REST_URL}/api/users/${address}`);
  return handleResponse(response);
}

export async function getUserHistory(address: string): Promise<{ history: Settlement[] }> {
  const response = await fetch(`${HUB_REST_URL}/api/users/${address}/history`);
  return handleResponse(response);
}

export async function getLeaderboard(limit?: number): Promise<{ leaderboard: UserStats[] }> {
  const qs = limit ? `?limit=${limit}` : '';
  const response = await fetch(`${HUB_REST_URL}/api/leaderboard${qs}`);
  return handleResponse(response);
}

// ── Market Maker Endpoints ──

export async function getMMInfo(): Promise<MMInfoResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/mm/info`);
  return handleResponse<MMInfoResponse>(response);
}

export async function requestMMFaucet(count = 1): Promise<MMFaucetResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/faucet/mm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });
  return handleResponse<MMFaucetResponse>(response);
}

// ── User Faucet Endpoints ──

export async function requestUserFaucet(address: string, count = 1): Promise<UserFaucetResponse> {
  const response = await fetch(`${HUB_REST_URL}/api/faucet/user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, count }),
  });
  return handleResponse<UserFaucetResponse>(response);
}
