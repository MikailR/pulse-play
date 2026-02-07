import { eq } from 'drizzle-orm';
import type { Team, CreateTeamParams, UpdateTeamParams } from './types.js';
import type { DrizzleDB } from '../../db/connection.js';
import { teams, sports, games } from '../../db/schema.js';

function toTeam(row: typeof teams.$inferSelect): Team {
  return {
    id: row.id,
    sportId: row.sportId,
    name: row.name,
    abbreviation: row.abbreviation,
    logoPath: row.logoPath,
    createdAt: row.createdAt,
  };
}

export class TeamManager {
  private db: DrizzleDB;

  constructor(db: DrizzleDB) {
    this.db = db;
  }

  createTeam(params: CreateTeamParams): Team {
    const { sportId, name, abbreviation, id } = params;

    // Validate sport exists
    const sport = this.db.select().from(sports).where(eq(sports.id, sportId)).get();
    if (!sport) {
      throw new Error(`Sport '${sportId}' not found`);
    }

    const teamId = id ?? `${abbreviation.toLowerCase()}-${Date.now()}`;
    const now = Date.now();

    this.db.insert(teams).values({
      id: teamId,
      sportId,
      name,
      abbreviation,
      logoPath: null,
      createdAt: now,
    }).run();

    return this.getTeamOrThrow(teamId);
  }

  updateTeam(teamId: string, updates: UpdateTeamParams): Team {
    this.getTeamOrThrow(teamId);

    const setClause: Record<string, unknown> = {};
    if (updates.name !== undefined) setClause.name = updates.name;
    if (updates.abbreviation !== undefined) setClause.abbreviation = updates.abbreviation;

    if (Object.keys(setClause).length > 0) {
      this.db.update(teams).set(setClause).where(eq(teams.id, teamId)).run();
    }

    return this.getTeamOrThrow(teamId);
  }

  setLogoPath(teamId: string, logoPath: string): Team {
    this.getTeamOrThrow(teamId);
    this.db.update(teams).set({ logoPath }).where(eq(teams.id, teamId)).run();
    return this.getTeamOrThrow(teamId);
  }

  deleteTeam(teamId: string): void {
    this.getTeamOrThrow(teamId);

    // Check if any games reference this team
    const homeGames = this.db.select().from(games).where(eq(games.homeTeamId, teamId)).all();
    const awayGames = this.db.select().from(games).where(eq(games.awayTeamId, teamId)).all();
    if (homeGames.length > 0 || awayGames.length > 0) {
      throw new Error(`Cannot delete team '${teamId}': referenced by ${homeGames.length + awayGames.length} game(s)`);
    }

    this.db.delete(teams).where(eq(teams.id, teamId)).run();
  }

  getTeam(teamId: string): Team | null {
    const row = this.db.select().from(teams).where(eq(teams.id, teamId)).get();
    return row ? toTeam(row) : null;
  }

  getTeamsBySport(sportId: string): Team[] {
    return this.db.select().from(teams)
      .where(eq(teams.sportId, sportId))
      .all()
      .map(toTeam);
  }

  getAllTeams(): Team[] {
    return this.db.select().from(teams).all().map(toTeam);
  }

  private getTeamOrThrow(teamId: string): Team {
    const team = this.getTeam(teamId);
    if (!team) {
      throw new Error(`Team '${teamId}' not found`);
    }
    return team;
  }
}
