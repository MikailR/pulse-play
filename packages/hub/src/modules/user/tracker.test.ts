import { UserTracker } from './tracker';
import { createTestDb, seedDefaults, type DrizzleDB } from '../../db';
import { games, markets as marketsTable, settlements } from '../../db/schema';

describe('UserTracker', () => {
  let db: DrizzleDB;
  let tracker: UserTracker;

  const GAME_ID = 'test-game-1';
  const MARKET_ID = `${GAME_ID}-pitching-1`;

  beforeEach(() => {
    db = createTestDb();
    seedDefaults(db);

    // Seed game and market for settlement FKs
    db.insert(games).values({
      id: GAME_ID,
      sportId: 'baseball',
      homeTeam: 'NYY',
      awayTeam: 'BOS',
      status: 'ACTIVE',
      createdAt: Date.now(),
    }).run();

    db.insert(marketsTable).values({
      id: MARKET_ID,
      gameId: GAME_ID,
      categoryId: 'pitching',
      sequenceNum: 1,
      status: 'RESOLVED',
      quantities: JSON.stringify([0, 0]),
      b: 100,
      outcome: 'BALL',
      createdAt: Date.now(),
    }).run();

    tracker = new UserTracker(db);
  });

  describe('ensureUser', () => {
    test('creates a new user with default stats', () => {
      tracker.ensureUser('0xAAA');
      const user = tracker.getUser('0xAAA');
      expect(user).not.toBeNull();
      expect(user!.totalBets).toBe(0);
      expect(user!.totalWins).toBe(0);
      expect(user!.totalLosses).toBe(0);
      expect(user!.totalWagered).toBe(0);
      expect(user!.totalPayout).toBe(0);
      expect(user!.netPnl).toBe(0);
    });

    test('is idempotent — does not overwrite existing user', () => {
      tracker.ensureUser('0xAAA');
      tracker.recordBet('0xAAA', 10);
      tracker.ensureUser('0xAAA'); // should not reset stats
      const user = tracker.getUser('0xAAA')!;
      expect(user.totalBets).toBe(1);
    });
  });

  describe('recordBet', () => {
    test('increments totalBets and totalWagered', () => {
      tracker.recordBet('0xAAA', 10);
      tracker.recordBet('0xAAA', 25);
      const user = tracker.getUser('0xAAA')!;
      expect(user.totalBets).toBe(2);
      expect(user.totalWagered).toBe(35);
    });

    test('creates user if not exists', () => {
      tracker.recordBet('0xNEW', 5);
      const user = tracker.getUser('0xNEW');
      expect(user).not.toBeNull();
      expect(user!.totalBets).toBe(1);
    });

    test('updates lastActiveAt', () => {
      const before = Date.now();
      tracker.recordBet('0xAAA', 10);
      const user = tracker.getUser('0xAAA')!;
      expect(user.lastActiveAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('recordWin', () => {
    test('increments totalWins, totalPayout, and netPnl', () => {
      tracker.recordBet('0xAAA', 10);
      tracker.recordWin('0xAAA', 15, 10); // payout=15, costPaid=10 → profit=5
      const user = tracker.getUser('0xAAA')!;
      expect(user.totalWins).toBe(1);
      expect(user.totalPayout).toBe(15);
      expect(user.netPnl).toBe(5); // profit = 15 - 10
    });
  });

  describe('recordLoss', () => {
    test('increments totalLosses and decrements netPnl', () => {
      tracker.recordBet('0xAAA', 10);
      tracker.recordLoss('0xAAA', 10);
      const user = tracker.getUser('0xAAA')!;
      expect(user.totalLosses).toBe(1);
      expect(user.netPnl).toBe(-10);
    });
  });

  describe('getLeaderboard', () => {
    test('returns users ordered by netPnl descending', () => {
      tracker.recordBet('0xAAA', 10);
      tracker.recordWin('0xAAA', 20, 10); // net = +10

      tracker.recordBet('0xBBB', 10);
      tracker.recordLoss('0xBBB', 10); // net = -10

      tracker.recordBet('0xCCC', 5);
      tracker.recordWin('0xCCC', 50, 5); // net = +45

      const leaderboard = tracker.getLeaderboard();
      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].address).toBe('0xCCC');
      expect(leaderboard[1].address).toBe('0xAAA');
      expect(leaderboard[2].address).toBe('0xBBB');
    });

    test('respects limit parameter', () => {
      tracker.recordBet('0xAAA', 10);
      tracker.recordBet('0xBBB', 10);
      tracker.recordBet('0xCCC', 10);

      const leaderboard = tracker.getLeaderboard(2);
      expect(leaderboard).toHaveLength(2);
    });
  });

  describe('getUserHistory', () => {
    test('returns settlement history for a user', () => {
      // Manually insert settlements for test
      const now = Date.now();
      db.insert(settlements).values([
        { marketId: MARKET_ID, address: '0xAAA', outcome: 'BALL', result: 'WIN', shares: 12, costPaid: 8, payout: 12, profit: 4, appSessionId: 's1', settledAt: now },
        { marketId: MARKET_ID, address: '0xAAA', outcome: 'STRIKE', result: 'LOSS', shares: 10, costPaid: 10, payout: 0, profit: -10, appSessionId: 's2', settledAt: now },
      ]).run();

      const history = tracker.getUserHistory('0xAAA');
      expect(history).toHaveLength(2);
      expect(history[0].result).toBe('WIN');
      expect(history[1].result).toBe('LOSS');
    });

    test('returns empty array for user with no history', () => {
      expect(tracker.getUserHistory('0xNONE')).toEqual([]);
    });
  });

  describe('getUser', () => {
    test('returns null for non-existent user', () => {
      expect(tracker.getUser('0xNONE')).toBeNull();
    });
  });
});
