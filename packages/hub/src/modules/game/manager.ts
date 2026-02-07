import { eq } from 'drizzle-orm';
import type { Game, GameStatus } from './types.js';
import type { DrizzleDB } from '../../db/connection.js';
import { games } from '../../db/schema.js';

function toGame(row: typeof games.$inferSelect): Game {
  return {
    id: row.id,
    sportId: row.sportId,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    status: row.status as GameStatus,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export class GameManager {
  private db: DrizzleDB;

  constructor(db: DrizzleDB) {
    this.db = db;
  }

  createGame(sportId: string, homeTeam: string, awayTeam: string, id?: string): Game {
    const gameId = id ?? `${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}-${Date.now()}`;
    const now = Date.now();

    this.db.insert(games).values({
      id: gameId,
      sportId,
      homeTeam,
      awayTeam,
      status: 'SCHEDULED',
      startedAt: null,
      completedAt: null,
      metadata: null,
      createdAt: now,
    }).run();

    return this.getGameOrThrow(gameId);
  }

  activateGame(gameId: string): Game {
    const game = this.getGameOrThrow(gameId);
    if (game.status !== 'SCHEDULED') {
      throw new Error(`Cannot activate game: status is ${game.status}`);
    }

    this.db.update(games)
      .set({ status: 'ACTIVE', startedAt: Date.now() })
      .where(eq(games.id, gameId))
      .run();

    return this.getGameOrThrow(gameId);
  }

  completeGame(gameId: string): Game {
    const game = this.getGameOrThrow(gameId);
    if (game.status !== 'ACTIVE') {
      throw new Error(`Cannot complete game: status is ${game.status}`);
    }

    this.db.update(games)
      .set({ status: 'COMPLETED', completedAt: Date.now() })
      .where(eq(games.id, gameId))
      .run();

    return this.getGameOrThrow(gameId);
  }

  getGame(gameId: string): Game | null {
    const row = this.db.select().from(games).where(eq(games.id, gameId)).get();
    return row ? toGame(row) : null;
  }

  getActiveGames(): Game[] {
    return this.db.select().from(games)
      .where(eq(games.status, 'ACTIVE'))
      .all()
      .map(toGame);
  }

  getGamesBySport(sportId: string): Game[] {
    return this.db.select().from(games)
      .where(eq(games.sportId, sportId))
      .all()
      .map(toGame);
  }

  getAllGames(statusFilter?: GameStatus): Game[] {
    if (statusFilter) {
      return this.db.select().from(games)
        .where(eq(games.status, statusFilter))
        .all()
        .map(toGame);
    }
    return this.db.select().from(games).all().map(toGame);
  }

  private getGameOrThrow(gameId: string): Game {
    const game = this.getGame(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }
    return game;
  }
}
