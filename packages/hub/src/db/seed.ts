import type { DrizzleDB } from './connection.js';
import { sports, marketCategories } from './schema.js';

/**
 * Seeds the database with default sports and market categories.
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
}
