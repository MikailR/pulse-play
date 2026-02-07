import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { eq } from 'drizzle-orm';
import { sports, marketCategories } from '../db/schema.js';

export function registerSportRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/api/sports', async () => {
    const rows = ctx.db.select().from(sports).all();
    return { sports: rows };
  });

  app.get<{ Params: { sportId: string } }>('/api/sports/:sportId/categories', async (req, reply) => {
    const { sportId } = req.params;

    const sport = ctx.db.select().from(sports).where(eq(sports.id, sportId)).get();
    if (!sport) {
      return reply.status(404).send({ error: `Sport '${sportId}' not found` });
    }

    const rows = ctx.db.select().from(marketCategories)
      .where(eq(marketCategories.sportId, sportId))
      .all();

    // Parse outcomes from JSON string to array for the API response
    const categories = rows.map((row) => ({
      ...row,
      outcomes: JSON.parse(row.outcomes) as string[],
    }));

    return { sportId, categories };
  });
}
