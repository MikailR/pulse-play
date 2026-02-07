'use client';

import { useEffect, useState, useCallback } from 'react';
import { getGames, getTeams, getSports, createGame, activateGame, completeGame } from '@/lib/api';
import type { Game, Team, Sport } from '@/lib/types';
import { HUB_REST_URL } from '@/lib/config';

function getMatchupDisplay(game: Game) {
  const home = game.homeTeam?.abbreviation ?? game.homeTeamId;
  const away = game.awayTeam?.abbreviation ?? game.awayTeamId;
  return `${home} vs ${away}`;
}

export function GamesPanel() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sportId, setSportId] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      const filters: { status?: string } = {};
      if (statusFilter) filters.status = statusFilter;
      const data = await getGames(filters);
      setGames(data.games);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchGames();
  }, [fetchGames]);

  // Fetch sports and teams for create form
  useEffect(() => {
    if (!showCreate) return;
    Promise.all([getSports(), getTeams()]).then(([s, t]) => {
      setSports(s.sports);
      setTeams(t.teams);
      if (s.sports.length > 0 && !sportId) {
        setSportId(s.sports[0].id);
      }
    }).catch(() => {});
  }, [showCreate]);

  const filteredTeams = teams.filter((t) => t.sportId === sportId);

  const handleCreate = async () => {
    if (!homeTeamId || !awayTeamId) {
      setCreateError('Both teams are required');
      return;
    }
    if (homeTeamId === awayTeamId) {
      setCreateError('Home and away teams must be different');
      return;
    }
    setCreateError(null);
    try {
      await createGame(sportId, homeTeamId, awayTeamId);
      setHomeTeamId('');
      setAwayTeamId('');
      setShowCreate(false);
      await fetchGames();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create game');
    }
  };

  const handleActivate = async (gameId: string) => {
    setActionError(null);
    try {
      await activateGame(gameId);
      await fetchGames();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to activate');
    }
  };

  const handleComplete = async (gameId: string) => {
    setActionError(null);
    try {
      await completeGame(gameId);
      await fetchGames();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to complete');
    }
  };

  return (
    <div data-testid="games-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {['', 'SCHEDULED', 'ACTIVE', 'COMPLETED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-surface-input text-text-primary'
                  : 'bg-surface-raised text-text-secondary hover:text-text-primary'
              }`}
              data-testid={`filter-${s || 'all'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-sm text-accent hover:text-accent-hover"
          data-testid="toggle-create"
        >
          {showCreate ? 'Cancel' : '+ New Game'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-surface-overlay rounded-lg p-4 mb-4 space-y-2" data-testid="create-form">
          <select
            value={sportId}
            onChange={(e) => {
              setSportId(e.target.value);
              setHomeTeamId('');
              setAwayTeamId('');
            }}
            className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm"
            data-testid="create-sport"
          >
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm"
            data-testid="create-home"
          >
            <option value="">Select Home Team</option>
            {filteredTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.abbreviation})</option>
            ))}
          </select>
          <select
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
            className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm"
            data-testid="create-away"
          >
            <option value="">Select Away Team</option>
            {filteredTeams.filter((t) => t.id !== homeTeamId).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.abbreviation})</option>
            ))}
          </select>
          {createError && <p className="text-red-400 text-sm" data-testid="create-error">{createError}</p>}
          <button
            onClick={handleCreate}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
            data-testid="create-submit"
          >
            Create Game
          </button>
        </div>
      )}

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-2 mb-4 text-sm text-red-400" data-testid="action-error">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2" data-testid="games-loading">
          <div className="h-16 bg-surface-input rounded" />
          <div className="h-16 bg-surface-input rounded" />
        </div>
      ) : games.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8" data-testid="games-empty">
          No games found.
        </p>
      ) : (
        <div className="space-y-2" data-testid="games-list">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-surface-raised border border-border rounded-lg px-4 py-3 flex items-center justify-between"
              data-testid={`admin-game-${game.id}`}
            >
              <div className="flex items-center gap-3">
                {game.homeTeam?.logoPath && (
                  <img
                    src={`${HUB_REST_URL}${game.homeTeam.logoPath}`}
                    alt={game.homeTeam.name}
                    className="w-6 h-6 object-contain"
                  />
                )}
                <span className="text-text-primary font-medium">
                  {getMatchupDisplay(game)}
                </span>
                {game.awayTeam?.logoPath && (
                  <img
                    src={`${HUB_REST_URL}${game.awayTeam.logoPath}`}
                    alt={game.awayTeam.name}
                    className="w-6 h-6 object-contain"
                  />
                )}
                <span className="text-text-muted text-xs ml-2 capitalize">{game.sportId}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    game.status === 'ACTIVE'
                      ? 'bg-green-500/20 text-green-400'
                      : game.status === 'COMPLETED'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-600/50 text-gray-400'
                  }`}
                >
                  {game.status}
                </span>
                {game.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleActivate(game.id)}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                    data-testid={`activate-${game.id}`}
                  >
                    Activate
                  </button>
                )}
                {game.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleComplete(game.id)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                    data-testid={`complete-${game.id}`}
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
