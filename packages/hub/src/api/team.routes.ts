import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { saveUpload } from './upload.js';

export function registerTeamRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Querystring: { sportId?: string } }>('/api/teams', async (req) => {
    const { sportId } = req.query;
    const teams = sportId
      ? ctx.teamManager.getTeamsBySport(sportId)
      : ctx.teamManager.getAllTeams();
    return { teams };
  });

  app.get<{ Params: { teamId: string } }>('/api/teams/:teamId', async (req, reply) => {
    const team = ctx.teamManager.getTeam(req.params.teamId);
    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }
    return { team };
  });

  app.post<{ Body: { sportId?: string; name?: string; abbreviation?: string; id?: string } }>(
    '/api/teams',
    async (req, reply) => {
      const { sportId, name, abbreviation, id } = req.body ?? {} as any;
      if (!sportId || !name || !abbreviation) {
        return reply.status(400).send({ error: 'sportId, name, and abbreviation are required' });
      }

      try {
        const team = ctx.teamManager.createTeam({ sportId, name, abbreviation, id });
        return { success: true, team };
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );

  app.put<{ Params: { teamId: string }; Body: { name?: string; abbreviation?: string } }>(
    '/api/teams/:teamId',
    async (req, reply) => {
      const { name, abbreviation } = req.body ?? {} as any;
      try {
        const team = ctx.teamManager.updateTeam(req.params.teamId, { name, abbreviation });
        return { success: true, team };
      } catch (err: any) {
        return reply.status(404).send({ error: err.message });
      }
    },
  );

  app.delete<{ Params: { teamId: string } }>(
    '/api/teams/:teamId',
    async (req, reply) => {
      try {
        ctx.teamManager.deleteTeam(req.params.teamId);
        return { success: true };
      } catch (err: any) {
        const status = err.message.includes('not found') ? 404 : 409;
        return reply.status(status).send({ error: err.message });
      }
    },
  );

  app.post<{ Params: { teamId: string } }>(
    '/api/teams/:teamId/logo',
    async (req, reply) => {
      const { teamId } = req.params;
      const team = ctx.teamManager.getTeam(teamId);
      if (!team) {
        return reply.status(404).send({ error: 'Team not found' });
      }

      const file = await req.file();
      if (!file) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      try {
        const logoPath = await saveUpload(file, 'teams', teamId, ctx.uploadsDir);
        const updated = ctx.teamManager.setLogoPath(teamId, logoPath);
        return { success: true, team: updated };
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    },
  );
}
