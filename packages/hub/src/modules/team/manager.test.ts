import { TeamManager } from './manager';
import { createTestDb } from '../../db/connection';
import { seedDefaults } from '../../db/seed';
import { games } from '../../db/schema';

describe('TeamManager', () => {
  let db: ReturnType<typeof createTestDb>;
  let manager: TeamManager;

  beforeEach(() => {
    db = createTestDb();
    seedDefaults(db);
    manager = new TeamManager(db);
  });

  describe('createTeam', () => {
    it('creates a team with explicit id', () => {
      const team = manager.createTeam({
        sportId: 'baseball',
        name: 'Test Team',
        abbreviation: 'TST',
        id: 'test-team',
      });

      expect(team.id).toBe('test-team');
      expect(team.sportId).toBe('baseball');
      expect(team.name).toBe('Test Team');
      expect(team.abbreviation).toBe('TST');
      expect(team.logoPath).toBeNull();
      expect(team.createdAt).toBeGreaterThan(0);
    });

    it('generates an id when not provided', () => {
      const team = manager.createTeam({
        sportId: 'baseball',
        name: 'Auto ID Team',
        abbreviation: 'AIT',
      });

      expect(team.id).toMatch(/^ait-\d+$/);
    });

    it('throws if sport does not exist', () => {
      expect(() => manager.createTeam({
        sportId: 'nonexistent',
        name: 'Bad Team',
        abbreviation: 'BAD',
      })).toThrow("Sport 'nonexistent' not found");
    });
  });

  describe('getTeam', () => {
    it('returns team by id', () => {
      // Seeded teams exist
      const team = manager.getTeam('nyy');
      expect(team).not.toBeNull();
      expect(team!.name).toBe('New York Yankees');
      expect(team!.abbreviation).toBe('NYY');
    });

    it('returns null for nonexistent team', () => {
      expect(manager.getTeam('nonexistent')).toBeNull();
    });
  });

  describe('getTeamsBySport', () => {
    it('returns teams filtered by sport', () => {
      const baseballTeams = manager.getTeamsBySport('baseball');
      expect(baseballTeams.length).toBe(6);
      expect(baseballTeams.every((t) => t.sportId === 'baseball')).toBe(true);
    });

    it('returns empty array for sport with no teams', () => {
      // Create a sport with no teams would need direct DB insert
      // Instead test with nonexistent sport
      expect(manager.getTeamsBySport('cricket')).toEqual([]);
    });
  });

  describe('getAllTeams', () => {
    it('returns all seeded teams', () => {
      const allTeams = manager.getAllTeams();
      expect(allTeams.length).toBe(18); // 6 baseball + 6 basketball + 6 soccer
    });
  });

  describe('updateTeam', () => {
    it('updates team name', () => {
      const updated = manager.updateTeam('nyy', { name: 'NY Yankees' });
      expect(updated.name).toBe('NY Yankees');
      expect(updated.abbreviation).toBe('NYY'); // unchanged
    });

    it('updates team abbreviation', () => {
      const updated = manager.updateTeam('nyy', { abbreviation: 'NY' });
      expect(updated.abbreviation).toBe('NY');
      expect(updated.name).toBe('New York Yankees'); // unchanged
    });

    it('updates both name and abbreviation', () => {
      const updated = manager.updateTeam('nyy', { name: 'Yankees', abbreviation: 'YNK' });
      expect(updated.name).toBe('Yankees');
      expect(updated.abbreviation).toBe('YNK');
    });

    it('throws if team does not exist', () => {
      expect(() => manager.updateTeam('nonexistent', { name: 'X' }))
        .toThrow("Team 'nonexistent' not found");
    });

    it('returns unchanged team when no updates provided', () => {
      const updated = manager.updateTeam('nyy', {});
      expect(updated.name).toBe('New York Yankees');
    });
  });

  describe('setLogoPath', () => {
    it('sets logo path on a team', () => {
      const updated = manager.setLogoPath('nyy', '/uploads/teams/nyy.png');
      expect(updated.logoPath).toBe('/uploads/teams/nyy.png');
    });

    it('throws if team does not exist', () => {
      expect(() => manager.setLogoPath('nonexistent', '/uploads/teams/x.png'))
        .toThrow("Team 'nonexistent' not found");
    });
  });

  describe('deleteTeam', () => {
    it('deletes a team with no game references', () => {
      manager.createTeam({ sportId: 'baseball', name: 'Temp', abbreviation: 'TMP', id: 'temp' });
      manager.deleteTeam('temp');
      expect(manager.getTeam('temp')).toBeNull();
    });

    it('throws if team does not exist', () => {
      expect(() => manager.deleteTeam('nonexistent'))
        .toThrow("Team 'nonexistent' not found");
    });

    it('throws if team is referenced by games', () => {
      // Create a game referencing nyy
      db.insert(games).values({
        id: 'test-game',
        sportId: 'baseball',
        homeTeamId: 'nyy',
        awayTeamId: 'bos',
        status: 'SCHEDULED',
        createdAt: Date.now(),
      }).run();

      expect(() => manager.deleteTeam('nyy'))
        .toThrow("Cannot delete team 'nyy': referenced by 1 game(s)");
    });
  });
});
