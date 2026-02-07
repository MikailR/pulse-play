import { GameManager } from './manager';
import { createTestDb, seedDefaults, type DrizzleDB } from '../../db';

describe('GameManager', () => {
  let db: DrizzleDB;
  let manager: GameManager;

  beforeEach(() => {
    db = createTestDb();
    seedDefaults(db);
    manager = new GameManager(db);
  });

  describe('createGame', () => {
    test('creates a game with SCHEDULED status', () => {
      const game = manager.createGame('baseball', 'NYY', 'BOS', 'nyy-bos-1');
      expect(game.status).toBe('SCHEDULED');
      expect(game.sportId).toBe('baseball');
      expect(game.homeTeam).toBe('NYY');
      expect(game.awayTeam).toBe('BOS');
    });

    test('auto-generates ID if not provided', () => {
      const game = manager.createGame('baseball', 'NYY', 'BOS');
      expect(game.id).toContain('nyy-bos-');
    });

    test('sets createdAt timestamp', () => {
      const before = Date.now();
      const game = manager.createGame('baseball', 'NYY', 'BOS', 'test-1');
      expect(game.createdAt).toBeGreaterThanOrEqual(before);
    });

    test('new game has null startedAt and completedAt', () => {
      const game = manager.createGame('baseball', 'NYY', 'BOS', 'test-1');
      expect(game.startedAt).toBeNull();
      expect(game.completedAt).toBeNull();
    });
  });

  describe('activateGame', () => {
    test('transitions SCHEDULED → ACTIVE', () => {
      manager.createGame('baseball', 'NYY', 'BOS', 'test-1');
      const game = manager.activateGame('test-1');
      expect(game.status).toBe('ACTIVE');
      expect(game.startedAt).not.toBeNull();
    });

    test('throws when game is already ACTIVE', () => {
      manager.createGame('baseball', 'NYY', 'BOS', 'test-1');
      manager.activateGame('test-1');
      expect(() => manager.activateGame('test-1')).toThrow('Cannot activate');
    });

    test('throws when game is COMPLETED', () => {
      manager.createGame('baseball', 'NYY', 'BOS', 'test-1');
      manager.activateGame('test-1');
      manager.completeGame('test-1');
      expect(() => manager.activateGame('test-1')).toThrow('Cannot activate');
    });
  });

  describe('completeGame', () => {
    test('transitions ACTIVE → COMPLETED', () => {
      manager.createGame('baseball', 'NYY', 'BOS', 'test-1');
      manager.activateGame('test-1');
      const game = manager.completeGame('test-1');
      expect(game.status).toBe('COMPLETED');
      expect(game.completedAt).not.toBeNull();
    });

    test('throws when game is SCHEDULED', () => {
      manager.createGame('baseball', 'NYY', 'BOS', 'test-1');
      expect(() => manager.completeGame('test-1')).toThrow('Cannot complete');
    });
  });

  describe('getGame', () => {
    test('returns game by ID', () => {
      manager.createGame('baseball', 'NYY', 'BOS', 'test-1');
      const game = manager.getGame('test-1');
      expect(game).not.toBeNull();
      expect(game!.id).toBe('test-1');
    });

    test('returns null for non-existent game', () => {
      expect(manager.getGame('nonexistent')).toBeNull();
    });
  });

  describe('getActiveGames', () => {
    test('returns only ACTIVE games', () => {
      manager.createGame('baseball', 'NYY', 'BOS', 'g1');
      manager.createGame('baseball', 'LAD', 'SFG', 'g2');
      manager.activateGame('g1');

      const active = manager.getActiveGames();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('g1');
    });
  });

  describe('getGamesBySport', () => {
    test('filters by sport', () => {
      manager.createGame('baseball', 'NYY', 'BOS', 'g1');
      manager.createGame('basketball', 'LAL', 'GSW', 'g2');

      const baseballGames = manager.getGamesBySport('baseball');
      expect(baseballGames).toHaveLength(1);
      expect(baseballGames[0].id).toBe('g1');
    });
  });

  describe('getAllGames', () => {
    test('returns all games without filter', () => {
      manager.createGame('baseball', 'NYY', 'BOS', 'g1');
      manager.createGame('basketball', 'LAL', 'GSW', 'g2');
      expect(manager.getAllGames()).toHaveLength(2);
    });

    test('filters by status', () => {
      manager.createGame('baseball', 'NYY', 'BOS', 'g1');
      manager.createGame('baseball', 'LAD', 'SFG', 'g2');
      manager.activateGame('g1');
      expect(manager.getAllGames('ACTIVE')).toHaveLength(1);
      expect(manager.getAllGames('SCHEDULED')).toHaveLength(1);
    });
  });
});
