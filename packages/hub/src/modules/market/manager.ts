import type { Outcome } from '../lmsr/types.js';
import type { Market, MarketStatus, ResolutionResult } from './types.js';
import type { Position } from '../position/types.js';

const VALID_TRANSITIONS: Record<MarketStatus, MarketStatus[]> = {
  PENDING: ['OPEN'],
  OPEN: ['CLOSED'],
  CLOSED: ['RESOLVED'],
  RESOLVED: [],
};

export class MarketManager {
  private markets: Map<string, Market> = new Map();
  private currentMarketId: string | null = null;
  private defaultB: number;

  constructor(defaultB: number = 100) {
    this.defaultB = defaultB;
  }

  createMarket(marketId: string): Market {
    const market: Market = {
      id: marketId,
      status: 'PENDING',
      qBall: 0,
      qStrike: 0,
      b: this.defaultB,
      outcome: null,
      createdAt: Date.now(),
      openedAt: null,
      closedAt: null,
      resolvedAt: null,
    };
    this.markets.set(marketId, market);
    this.currentMarketId = marketId;
    return market;
  }

  openMarket(marketId: string): Market {
    const market = this.getMarketOrThrow(marketId);
    this.transition(market, 'OPEN');
    market.openedAt = Date.now();
    return market;
  }

  closeMarket(marketId: string): Market {
    const market = this.getMarketOrThrow(marketId);
    this.transition(market, 'CLOSED');
    market.closedAt = Date.now();
    return market;
  }

  resolveMarket(
    marketId: string,
    outcome: Outcome,
    positions: Position[] = [],
  ): ResolutionResult {
    const market = this.getMarketOrThrow(marketId);
    this.transition(market, 'RESOLVED');
    market.outcome = outcome;
    market.resolvedAt = Date.now();

    const winners: ResolutionResult['winners'] = [];
    const losers: ResolutionResult['losers'] = [];

    for (const pos of positions) {
      if (pos.outcome === outcome) {
        winners.push({
          address: pos.address,
          payout: pos.shares,
          appSessionId: pos.appSessionId,
        });
      } else {
        losers.push({
          address: pos.address,
          loss: pos.costPaid,
          appSessionId: pos.appSessionId,
        });
      }
    }

    const totalPayout = winners.reduce((sum, w) => sum + w.payout, 0);
    return { winners, losers, totalPayout };
  }

  updateQuantities(marketId: string, qBall: number, qStrike: number): void {
    const market = this.getMarketOrThrow(marketId);
    market.qBall = qBall;
    market.qStrike = qStrike;
  }

  getMarket(marketId: string): Market | null {
    return this.markets.get(marketId) ?? null;
  }

  getCurrentMarket(): Market | null {
    if (!this.currentMarketId) return null;
    return this.markets.get(this.currentMarketId) ?? null;
  }

  private getMarketOrThrow(marketId: string): Market {
    const market = this.markets.get(marketId);
    if (!market) {
      throw new Error(`Market ${marketId} not found`);
    }
    return market;
  }

  private transition(market: Market, to: MarketStatus): void {
    const allowed = VALID_TRANSITIONS[market.status];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invalid transition: ${market.status} → ${to}`,
      );
    }
    market.status = to;
  }
}
