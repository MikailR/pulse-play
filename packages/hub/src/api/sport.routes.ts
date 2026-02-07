import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { eq } from 'drizzle-orm';
import { sports, marketCategories, teams, games, markets } from '../db/schema.js';

export function registerSportRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/api/sports', async () => {
    const rows = ctx.db.select().from(sports).all();
    return { sports: rows };
  });

  app.post<{ Body: { name?: string; description?: string; id?: string } }>(
    '/api/sports',
    async (req, reply) => {
      const { name, description, id } = req.body ?? {} as any;
      if (!name) {
        return reply.status(400).send({ error: 'name is required' });
      }

      const sportId = id ?? name.toLowerCase().replace(/\s+/g, '_');
      const existing = ctx.db.select().from(sports).where(eq(sports.id, sportId)).get();
      if (existing) {
        return reply.status(409).send({ error: `Sport '${sportId}' already exists` });
      }

      ctx.db.insert(sports).values({
        id: sportId,
        name,
        description: description ?? null,
        createdAt: Date.now(),
      }).run();

      const sport = ctx.db.select().from(sports).where(eq(sports.id, sportId)).get();
      return { success: true, sport };
    },
  );

  app.put<{ Params: { sportId: string }; Body: { name?: string; description?: string } }>(
    '/api/sports/:sportId',
    async (req, reply) => {
      const { sportId } = req.params;
      const sport = ctx.db.select().from(sports).where(eq(sports.id, sportId)).get();
      if (!sport) {
        return reply.status(404).send({ error: `Sport '${sportId}' not found` });
      }

      const { name, description } = req.body ?? {} as any;
      const setClause: Record<string, unknown> = {};
      if (name !== undefined) setClause.name = name;
      if (description !== undefined) setClause.description = description;

      if (Object.keys(setClause).length > 0) {
        ctx.db.update(sports).set(setClause).where(eq(sports.id, sportId)).run();
      }

      const updated = ctx.db.select().from(sports).where(eq(sports.id, sportId)).get();
      return { success: true, sport: updated };
    },
  );

  app.delete<{ Params: { sportId: string } }>(
    '/api/sports/:sportId',
    async (req, reply) => {
      const { sportId } = req.params;
      const sport = ctx.db.select().from(sports).where(eq(sports.id, sportId)).get();
      if (!sport) {
        return reply.status(404).send({ error: `Sport '${sportId}' not found` });
      }

      // Check referential integrity
      const teamCount = ctx.db.select().from(teams).where(eq(teams.sportId, sportId)).all().length;
      if (teamCount > 0) {
        return reply.status(409).send({ error: `Cannot delete sport '${sportId}': ${teamCount} team(s) reference it` });
      }
      const gameCount = ctx.db.select().from(games).where(eq(games.sportId, sportId)).all().length;
      if (gameCount > 0) {
        return reply.status(409).send({ error: `Cannot delete sport '${sportId}': ${gameCount} game(s) reference it` });
      }
      const catCount = ctx.db.select().from(marketCategories).where(eq(marketCategories.sportId, sportId)).all().length;
      if (catCount > 0) {
        return reply.status(409).send({ error: `Cannot delete sport '${sportId}': ${catCount} category(ies) reference it` });
      }

      ctx.db.delete(sports).where(eq(sports.id, sportId)).run();
      return { success: true };
    },
  );

  // ── Categories ──

  app.get<{ Params: { sportId: string } }>('/api/sports/:sportId/categories', async (req, reply) => {
    const { sportId } = req.params;

    const sport = ctx.db.select().from(sports).where(eq(sports.id, sportId)).get();
    if (!sport) {
      return reply.status(404).send({ error: `Sport '${sportId}' not found` });
    }

    const rows = ctx.db.select().from(marketCategories)
      .where(eq(marketCategories.sportId, sportId))
      .all();

    const categories = rows.map((row) => ({
      ...row,
      outcomes: JSON.parse(row.outcomes) as string[],
    }));

    return { sportId, categories };
  });

  app.post<{ Params: { sportId: string }; Body: { name?: string; outcomes?: string[]; description?: string; id?: string } }>(
    '/api/sports/:sportId/categories',
    async (req, reply) => {
      const { sportId } = req.params;
      const sport = ctx.db.select().from(sports).where(eq(sports.id, sportId)).get();
      if (!sport) {
        return reply.status(404).send({ error: `Sport '${sportId}' not found` });
      }

      const { name, outcomes, description, id } = req.body ?? {} as any;
      if (!name || !outcomes || !Array.isArray(outcomes) || outcomes.length < 2) {
        return reply.status(400).send({ error: 'name and outcomes (array with at least 2 items) are required' });
      }

      const categoryId = id ?? `${sportId}_${name.toLowerCase().replace(/\s+/g, '_')}`;
      const existing = ctx.db.select().from(marketCategories).where(eq(marketCategories.id, categoryId)).get();
      if (existing) {
        return reply.status(409).send({ error: `Category '${categoryId}' already exists` });
      }

      ctx.db.insert(marketCategories).values({
        id: categoryId,
        sportId,
        name,
        outcomes: JSON.stringify(outcomes),
        description: description ?? null,
        createdAt: Date.now(),
      }).run();

      const row = ctx.db.select().from(marketCategories).where(eq(marketCategories.id, categoryId)).get()!;
      return {
        success: true,
        category: { ...row, outcomes: JSON.parse(row.outcomes) as string[] },
      };
    },
  );

  app.put<{ Params: { sportId: string; categoryId: string }; Body: { name?: string; outcomes?: string[]; description?: string } }>(
    '/api/sports/:sportId/categories/:categoryId',
    async (req, reply) => {
      const { sportId, categoryId } = req.params;
      const row = ctx.db.select().from(marketCategories).where(eq(marketCategories.id, categoryId)).get();
      if (!row || row.sportId !== sportId) {
        return reply.status(404).send({ error: `Category '${categoryId}' not found for sport '${sportId}'` });
      }

      const { name, outcomes, description } = req.body ?? {} as any;
      const setClause: Record<string, unknown> = {};
      if (name !== undefined) setClause.name = name;
      if (outcomes !== undefined) {
        if (!Array.isArray(outcomes) || outcomes.length < 2) {
          return reply.status(400).send({ error: 'outcomes must be an array with at least 2 items' });
        }
        setClause.outcomes = JSON.stringify(outcomes);
      }
      if (description !== undefined) setClause.description = description;

      if (Object.keys(setClause).length > 0) {
        ctx.db.update(marketCategories).set(setClause).where(eq(marketCategories.id, categoryId)).run();
      }

      const updated = ctx.db.select().from(marketCategories).where(eq(marketCategories.id, categoryId)).get()!;
      return {
        success: true,
        category: { ...updated, outcomes: JSON.parse(updated.outcomes) as string[] },
      };
    },
  );

  app.delete<{ Params: { sportId: string; categoryId: string } }>(
    '/api/sports/:sportId/categories/:categoryId',
    async (req, reply) => {
      const { sportId, categoryId } = req.params;
      const row = ctx.db.select().from(marketCategories).where(eq(marketCategories.id, categoryId)).get();
      if (!row || row.sportId !== sportId) {
        return reply.status(404).send({ error: `Category '${categoryId}' not found for sport '${sportId}'` });
      }

      // Check if markets reference this category
      const marketCount = ctx.db.select().from(markets).where(eq(markets.categoryId, categoryId)).all().length;
      if (marketCount > 0) {
        return reply.status(409).send({ error: `Cannot delete category '${categoryId}': ${marketCount} market(s) reference it` });
      }

      ctx.db.delete(marketCategories).where(eq(marketCategories.id, categoryId)).run();
      return { success: true };
    },
  );
}
