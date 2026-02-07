import type { DrizzleDB } from './connection.js';
import { sports, marketCategories, teams } from './schema.js';

/**
 * Seeds the database with default sports, market categories, and teams.
 * Uses INSERT OR IGNORE to be idempotent — safe to call on every startup.
 */
export function seedDefaults(db: DrizzleDB): void {
  const now = Date.now();

  // ── Sports ──────────────────────────────────────────────────────────────
  db.insert(sports).values([
    { id: 'baseball', name: 'Baseball', description: 'Major League Baseball', createdAt: now },
    { id: 'basketball', name: 'Basketball', description: 'NBA Basketball', createdAt: now },
    { id: 'soccer', name: 'Soccer', description: 'Professional Soccer', createdAt: now },
  ]).onConflictDoNothing().run();

  // ── Market Categories ───────────────────────────────────────────────────
  db.insert(marketCategories).values([
    // Baseball
    { id: 'pitching', sportId: 'baseball', name: 'Pitching', outcomes: JSON.stringify(['BALL', 'STRIKE']), description: 'Ball vs Strike on each pitch', createdAt: now },
    { id: 'batting', sportId: 'baseball', name: 'Batting', outcomes: JSON.stringify(['HIT', 'OUT']), description: 'Hit vs Out on each at-bat', createdAt: now },

    // Basketball
    { id: 'free_throw', sportId: 'basketball', name: 'Free Throw', outcomes: JSON.stringify(['MAKE', 'MISS']), description: 'Make vs Miss on free throws', createdAt: now },
    { id: 'three_pointer', sportId: 'basketball', name: 'Three Pointer', outcomes: JSON.stringify(['MAKE', 'MISS']), description: 'Make vs Miss on three-point attempts', createdAt: now },

    // Soccer
    { id: 'penalty', sportId: 'soccer', name: 'Penalty Kick', outcomes: JSON.stringify(['GOAL', 'SAVE']), description: 'Goal vs Save on penalty kicks', createdAt: now },
  ]).onConflictDoNothing().run();

  // ── Teams ───────────────────────────────────────────────────────────────
  db.insert(teams).values([
    // Baseball
    { id: 'nyy', sportId: 'baseball', name: 'New York Yankees', abbreviation: 'NYY', createdAt: now },
    { id: 'bos', sportId: 'baseball', name: 'Boston Red Sox', abbreviation: 'BOS', createdAt: now },
    { id: 'lad', sportId: 'baseball', name: 'Los Angeles Dodgers', abbreviation: 'LAD', createdAt: now },
    { id: 'chc', sportId: 'baseball', name: 'Chicago Cubs', abbreviation: 'CHC', createdAt: now },
    { id: 'hou', sportId: 'baseball', name: 'Houston Astros', abbreviation: 'HOU', createdAt: now },
    { id: 'atl', sportId: 'baseball', name: 'Atlanta Braves', abbreviation: 'ATL', createdAt: now },

    // Basketball
    { id: 'lal', sportId: 'basketball', name: 'Los Angeles Lakers', abbreviation: 'LAL', createdAt: now },
    { id: 'gsw', sportId: 'basketball', name: 'Golden State Warriors', abbreviation: 'GSW', createdAt: now },
    { id: 'bkn', sportId: 'basketball', name: 'Brooklyn Nets', abbreviation: 'BKN', createdAt: now },
    { id: 'bos-nba', sportId: 'basketball', name: 'Boston Celtics', abbreviation: 'BOS', createdAt: now },
    { id: 'chi', sportId: 'basketball', name: 'Chicago Bulls', abbreviation: 'CHI', createdAt: now },
    { id: 'mia', sportId: 'basketball', name: 'Miami Heat', abbreviation: 'MIA', createdAt: now },

    // Soccer
    { id: 'fcb', sportId: 'soccer', name: 'FC Barcelona', abbreviation: 'FCB', createdAt: now },
    { id: 'rma', sportId: 'soccer', name: 'Real Madrid', abbreviation: 'RMA', createdAt: now },
    { id: 'liv', sportId: 'soccer', name: 'Liverpool FC', abbreviation: 'LIV', createdAt: now },
    { id: 'mci', sportId: 'soccer', name: 'Manchester City', abbreviation: 'MCI', createdAt: now },
    { id: 'bay', sportId: 'soccer', name: 'Bayern Munich', abbreviation: 'BAY', createdAt: now },
    { id: 'psg', sportId: 'soccer', name: 'Paris Saint-Germain', abbreviation: 'PSG', createdAt: now },
  ]).onConflictDoNothing().run();
}
