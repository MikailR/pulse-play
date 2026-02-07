import { eq } from 'drizzle-orm';
import { PositionTracker } from './tracker';
import type { Position } from './types';
import { createTestDb, seedDefaults, type DrizzleDB } from '../../db';
import { games, markets as marketsTable } from '../../db/schema';

const GAME_ID = 'test-game-1';
const MARKET_ID = `${GAME_ID}-pitching-1`;
const MARKET_ID_2 = `${GAME_ID}-pitching-2`;

function seedTestMarket(db: DrizzleDB, marketId: string, outcome?: string): void {
  const status = outcome ? 'RESOLVED' : 'OPEN';
  db.insert(marketsTable).values({
    id: marketId,
    gameId: GAME_ID,
    categoryId: 'pitching',
    sequenceNum: parseInt(marketId.split('-').pop()!, 10),
    status,
    quantities: JSON.stringify([0, 0]),
    b: 100,
    outcome: outcome ?? null,
    createdAt: Date.now(),
  }).onConflictDoNothing().run();
}

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    address: '0xAAA',
    marketId: MARKET_ID,
    outcome: 'BALL',
    shares: 10,
    costPaid: 5,
    appSessionId: 's1',
    appSessionVersion: 1,
    sessionStatus: 'open',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('PositionTracker', () => {
  let db: DrizzleDB;
  let tracker: PositionTracker;

  beforeEach(() => {
    db = createTestDb();
    seedDefaults(db);

    // Seed game and markets for FK constraints
    db.insert(games).values({
      id: GAME_ID,
      sportId: 'baseball',
      homeTeam: 'NYY',
      awayTeam: 'BOS',
      status: 'ACTIVE',
      createdAt: Date.now(),
    }).run();

    seedTestMarket(db, MARKET_ID);
    seedTestMarket(db, MARKET_ID_2);

    tracker = new PositionTracker(db);
  });

  // ─── Adding positions ──────────────────────────────────────────

  describe('addPosition', () => {
    test('1. addPosition() stores the position', () => {
      const pos = makePosition();
      tracker.addPosition(pos);
      expect(tracker.getPositionsByMarket(MARKET_ID)).toHaveLength(1);
    });

    test('2. Can add multiple positions for different users', () => {
      tracker.addPosition(makePosition({ address: '0xAAA', appSessionId: 's1' }));
      tracker.addPosition(makePosition({ address: '0xBBB', appSessionId: 's2' }));
      expect(tracker.getPositionsByMarket(MARKET_ID)).toHaveLength(2);
    });

    test('3. Can add multiple positions for same user on different markets', () => {
      tracker.addPosition(makePosition({ marketId: MARKET_ID, appSessionId: 's1' }));
      tracker.addPosition(makePosition({ marketId: MARKET_ID_2, appSessionId: 's2' }));
      expect(tracker.getPositionsByUser('0xAAA')).toHaveLength(2);
    });
  });

  // ─── Querying ──────────────────────────────────────────────────

  describe('querying', () => {
    test('4. getPositionsByMarket(id) returns only positions for that market', () => {
      tracker.addPosition(makePosition({ marketId: MARKET_ID, appSessionId: 's1' }));
      tracker.addPosition(makePosition({ marketId: MARKET_ID_2, appSessionId: 's2' }));
      const result = tracker.getPositionsByMarket(MARKET_ID);
      expect(result).toHaveLength(1);
      expect(result[0].marketId).toBe(MARKET_ID);
    });

    test('5. getPositionsByUser(address) returns only positions for that user', () => {
      tracker.addPosition(makePosition({ address: '0xAAA', appSessionId: 's1' }));
      tracker.addPosition(makePosition({ address: '0xBBB', appSessionId: 's2' }));
      const result = tracker.getPositionsByUser('0xAAA');
      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('0xAAA');
    });

    test('6. getPosition(address, marketId) returns specific position or null', () => {
      tracker.addPosition(makePosition({ address: '0xAAA', marketId: MARKET_ID }));
      expect(tracker.getPosition('0xAAA', MARKET_ID)).not.toBeNull();
      expect(tracker.getPosition('0xAAA', MARKET_ID_2)).toBeNull();
      expect(tracker.getPosition('0xBBB', MARKET_ID)).toBeNull();
    });

    test('7. Empty queries return empty arrays / null', () => {
      expect(tracker.getPositionsByMarket(MARKET_ID)).toEqual([]);
      expect(tracker.getPositionsByUser('0xAAA')).toEqual([]);
      expect(tracker.getPosition('0xAAA', MARKET_ID)).toBeNull();
    });
  });

  // ─── Cleanup + archival ──────────────────────────────────────────

  describe('clearPositions', () => {
    test('8. clearPositions(marketId) removes all positions for that market', () => {
      // Resolve the market first (required for archival)
      db.update(marketsTable).set({ status: 'RESOLVED', outcome: 'BALL' }).where(eq(marketsTable.id, MARKET_ID)).run();

      tracker.addPosition(makePosition({ address: '0xAAA', marketId: MARKET_ID, appSessionId: 's1' }));
      tracker.addPosition(makePosition({ address: '0xBBB', marketId: MARKET_ID, appSessionId: 's2' }));
      tracker.clearPositions(MARKET_ID);
      expect(tracker.getPositionsByMarket(MARKET_ID)).toEqual([]);
    });

    test('9. clearPositions() does not affect other markets', () => {
      db.update(marketsTable).set({ status: 'RESOLVED', outcome: 'BALL' }).where(eq(marketsTable.id, MARKET_ID)).run();

      tracker.addPosition(makePosition({ marketId: MARKET_ID, appSessionId: 's1' }));
      tracker.addPosition(makePosition({ marketId: MARKET_ID_2, appSessionId: 's2' }));
      tracker.clearPositions(MARKET_ID);
      expect(tracker.getPositionsByMarket(MARKET_ID_2)).toHaveLength(1);
    });

    test('10. After clearing, queries for that market return empty', () => {
      db.update(marketsTable).set({ status: 'RESOLVED', outcome: 'BALL' }).where(eq(marketsTable.id, MARKET_ID)).run();

      tracker.addPosition(makePosition({ address: '0xAAA', marketId: MARKET_ID }));
      tracker.clearPositions(MARKET_ID);
      expect(tracker.getPositionsByMarket(MARKET_ID)).toEqual([]);
      expect(tracker.getPosition('0xAAA', MARKET_ID)).toBeNull();
    });

    test('archives positions to settlements on clear', () => {
      db.update(marketsTable).set({ status: 'RESOLVED', outcome: 'BALL' }).where(eq(marketsTable.id, MARKET_ID)).run();

      tracker.addPosition(makePosition({ address: '0xAAA', outcome: 'BALL', shares: 12, costPaid: 8, appSessionId: 's1' }));
      tracker.addPosition(makePosition({ address: '0xBBB', outcome: 'STRIKE', shares: 15, costPaid: 10, appSessionId: 's2' }));
      tracker.clearPositions(MARKET_ID);

      const settles = tracker.getSettlementsByMarket(MARKET_ID);
      expect(settles).toHaveLength(2);

      const winner = settles.find((s) => s.address === '0xAAA')!;
      expect(winner.result).toBe('WIN');
      expect(winner.payout).toBe(12);
      expect(winner.profit).toBe(4); // 12 - 8

      const loser = settles.find((s) => s.address === '0xBBB')!;
      expect(loser.result).toBe('LOSS');
      expect(loser.payout).toBe(0);
      expect(loser.profit).toBe(-10); // 0 - 10
    });

    test('getSettlementsByUser returns settlements for that address', () => {
      db.update(marketsTable).set({ status: 'RESOLVED', outcome: 'BALL' }).where(eq(marketsTable.id, MARKET_ID)).run();

      tracker.addPosition(makePosition({ address: '0xAAA', outcome: 'BALL', appSessionId: 's1' }));
      tracker.addPosition(makePosition({ address: '0xBBB', outcome: 'STRIKE', appSessionId: 's2' }));
      tracker.clearPositions(MARKET_ID);

      expect(tracker.getSettlementsByUser('0xAAA')).toHaveLength(1);
      expect(tracker.getSettlementsByUser('0xBBB')).toHaveLength(1);
      expect(tracker.getSettlementsByUser('0xCCC')).toHaveLength(0);
    });
  });

  // ─── Session status ──────────────────────────────────────────

  describe('updateSessionStatus', () => {
    test('11. updates status on existing position', () => {
      tracker.addPosition(makePosition({ appSessionId: 's1' }));
      tracker.updateSessionStatus('s1', 'settled');
      expect(tracker.getPositionsByMarket(MARKET_ID)[0].sessionStatus).toBe('settled');
    });

    test('12. no-op when session ID not found', () => {
      tracker.addPosition(makePosition({ appSessionId: 's1' }));
      tracker.updateSessionStatus('unknown', 'settled');
      expect(tracker.getPositionsByMarket(MARKET_ID)[0].sessionStatus).toBe('open');
    });

    test('13. updates correct position among many', () => {
      tracker.addPosition(makePosition({ address: '0xAAA', appSessionId: 's1' }));
      tracker.addPosition(makePosition({ address: '0xBBB', appSessionId: 's2' }));
      tracker.updateSessionStatus('s2', 'settled');
      const positions = tracker.getPositionsByMarket(MARKET_ID);
      expect(positions[0].sessionStatus).toBe('open');
      expect(positions[1].sessionStatus).toBe('settled');
    });
  });
});
