import { eq, desc, sql } from 'drizzle-orm';
import type { UserStats } from './types.js';
import type { DrizzleDB } from '../../db/connection.js';
import { users, settlements } from '../../db/schema.js';
import type { Settlement } from '../position/tracker.js';

function toUserStats(row: typeof users.$inferSelect): UserStats {
  return {
    address: row.address,
    totalBets: row.totalBets,
    totalWins: row.totalWins,
    totalLosses: row.totalLosses,
    totalWagered: row.totalWagered,
    totalPayout: row.totalPayout,
    netPnl: row.netPnl,
    firstSeenAt: row.firstSeenAt,
    lastActiveAt: row.lastActiveAt,
  };
}

export class UserTracker {
  private db: DrizzleDB;

  constructor(db: DrizzleDB) {
    this.db = db;
  }

  ensureUser(address: string): void {
    const now = Date.now();
    this.db.insert(users).values({
      address,
      totalBets: 0,
      totalWins: 0,
      totalLosses: 0,
      totalWagered: 0,
      totalPayout: 0,
      netPnl: 0,
      firstSeenAt: now,
      lastActiveAt: now,
    }).onConflictDoNothing().run();
  }

  recordBet(address: string, amount: number): void {
    this.ensureUser(address);
    this.db.update(users)
      .set({
        totalBets: sql`total_bets + 1`,
        totalWagered: sql`total_wagered + ${amount}`,
        lastActiveAt: Date.now(),
      })
      .where(eq(users.address, address))
      .run();
  }

  recordWin(address: string, payout: number, costPaid: number): void {
    const profit = payout - costPaid;
    this.db.update(users)
      .set({
        totalWins: sql`total_wins + 1`,
        totalPayout: sql`total_payout + ${payout}`,
        netPnl: sql`net_pnl + ${profit}`,
        lastActiveAt: Date.now(),
      })
      .where(eq(users.address, address))
      .run();
  }

  recordLoss(address: string, loss: number): void {
    this.db.update(users)
      .set({
        totalLosses: sql`total_losses + 1`,
        netPnl: sql`net_pnl - ${loss}`,
        lastActiveAt: Date.now(),
      })
      .where(eq(users.address, address))
      .run();
  }

  getUser(address: string): UserStats | null {
    const row = this.db.select().from(users).where(eq(users.address, address)).get();
    return row ? toUserStats(row) : null;
  }

  getLeaderboard(limit: number = 10): UserStats[] {
    return this.db.select().from(users)
      .orderBy(desc(users.netPnl))
      .limit(limit)
      .all()
      .map(toUserStats);
  }

  getUserHistory(address: string): Settlement[] {
    return this.db.select().from(settlements)
      .where(eq(settlements.address, address))
      .all()
      .map((row) => ({
        id: row.id,
        marketId: row.marketId,
        address: row.address,
        outcome: row.outcome,
        result: row.result as 'WIN' | 'LOSS',
        shares: row.shares,
        costPaid: row.costPaid,
        payout: row.payout,
        profit: row.profit,
        appSessionId: row.appSessionId,
        settledAt: row.settledAt,
      }));
  }
}
