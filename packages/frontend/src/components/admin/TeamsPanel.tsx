'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSports, getTeams, createTeam, updateTeam, deleteTeam, uploadTeamLogo } from '@/lib/api';
import type { Sport, Team } from '@/lib/types';
import { HUB_REST_URL } from '@/lib/config';

export function TeamsPanel() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAbbrev, setNewAbbrev] = useState('');
  const [newSportId, setNewSportId] = useState('');

  // Edit
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAbbrev, setEditAbbrev] = useState('');

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Logo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sportsData, teamsData] = await Promise.all([
        getSports(),
        getTeams(selectedSport ?? undefined),
      ]);
      setSports(sportsData.sports);
      setTeams(teamsData.teams);
      if (!newSportId && sportsData.sports.length > 0) {
        setNewSportId(sportsData.sports[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSport]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!newName.trim() || !newAbbrev.trim() || !newSportId) return;
    setActionError(null);
    try {
      await createTeam(newSportId, newName.trim(), newAbbrev.trim().toUpperCase());
      setNewName('');
      setNewAbbrev('');
      setShowCreate(false);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create team');
    }
  };

  const handleUpdate = async (teamId: string) => {
    setActionError(null);
    try {
      await updateTeam(teamId, {
        name: editName.trim() || undefined,
        abbreviation: editAbbrev.trim().toUpperCase() || undefined,
      });
      setEditingTeam(null);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update team');
    }
  };

  const handleDelete = async (teamId: string) => {
    setActionError(null);
    try {
      await deleteTeam(teamId);
      setConfirmDelete(null);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete team');
    }
  };

  const handleLogoUpload = async (teamId: string, file: File) => {
    setUploadingLogo(teamId);
    setActionError(null);
    try {
      await uploadTeamLogo(teamId, file);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploadingLogo(null);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2" data-testid="teams-loading">
        <div className="h-12 bg-surface-input rounded" />
        <div className="h-12 bg-surface-input rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="teams-error" className="text-center py-8">
        <p className="text-red-400 text-sm mb-3">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-surface-raised text-text-primary rounded text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div data-testid="teams-panel">
      {/* Sport filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedSport(null)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            selectedSport === null
              ? 'bg-surface-input text-text-primary'
              : 'bg-surface-raised text-text-secondary hover:text-text-primary'
          }`}
          data-testid="filter-all-sports"
        >
          All
        </button>
        {sports.map((sport) => (
          <button
            key={sport.id}
            onClick={() => setSelectedSport(sport.id)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${
              selectedSport === sport.id
                ? 'bg-surface-input text-text-primary'
                : 'bg-surface-raised text-text-secondary hover:text-text-primary'
            }`}
            data-testid={`filter-sport-${sport.id}`}
          >
            {sport.name}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-sm text-accent hover:text-accent-hover"
            data-testid="toggle-create-team"
          >
            {showCreate ? 'Cancel' : '+ New Team'}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-2 mb-4 text-sm text-red-400" data-testid="team-action-error">
          {actionError}
        </div>
      )}

      {showCreate && (
        <div className="bg-surface-overlay rounded-lg p-4 mb-4 space-y-2" data-testid="create-team-form">
          <select
            value={newSportId}
            onChange={(e) => setNewSportId(e.target.value)}
            className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm"
            data-testid="create-team-sport"
          >
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            placeholder="Team name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm placeholder-text-muted"
            data-testid="create-team-name"
          />
          <input
            placeholder="Abbreviation (e.g. NYY)"
            value={newAbbrev}
            onChange={(e) => setNewAbbrev(e.target.value)}
            className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm placeholder-text-muted uppercase"
            data-testid="create-team-abbrev"
          />
          <button
            onClick={handleCreate}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
            data-testid="create-team-submit"
          >
            Create Team
          </button>
        </div>
      )}

      {/* Hidden file input for logo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg"
        className="hidden"
        data-testid="logo-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingLogo) {
            handleLogoUpload(uploadingLogo, file);
          }
          e.target.value = '';
        }}
      />

      {teams.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8" data-testid="teams-empty">
          No teams found.
        </p>
      ) : (
        <div className="space-y-2" data-testid="teams-list">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-surface-raised border border-border rounded-lg px-4 py-3 flex items-center justify-between"
              data-testid={`team-row-${team.id}`}
            >
              <div className="flex items-center gap-3">
                {team.logoPath ? (
                  <img
                    src={`${HUB_REST_URL}${team.logoPath}`}
                    alt={team.name}
                    className="w-8 h-8 object-contain rounded"
                    data-testid={`team-logo-${team.id}`}
                  />
                ) : (
                  <div className="w-8 h-8 bg-surface-input rounded flex items-center justify-center text-text-muted text-xs font-mono">
                    {team.abbreviation.slice(0, 2)}
                  </div>
                )}

                {editingTeam === team.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-surface-input text-text-primary rounded px-2 py-1 text-sm"
                      data-testid="edit-team-name"
                    />
                    <input
                      value={editAbbrev}
                      onChange={(e) => setEditAbbrev(e.target.value)}
                      className="bg-surface-input text-text-primary rounded px-2 py-1 text-sm w-20 uppercase"
                      data-testid="edit-team-abbrev"
                    />
                    <button
                      onClick={() => handleUpdate(team.id)}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                      data-testid="save-team"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingTeam(null)}
                      className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <span className="text-text-primary font-medium">{team.name}</span>
                    <span className="text-text-muted text-xs ml-2 font-mono">{team.abbreviation}</span>
                    <span className="text-text-muted text-xs ml-2 capitalize">{team.sportId}</span>
                  </div>
                )}
              </div>

              {editingTeam !== team.id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setUploadingLogo(team.id);
                      fileInputRef.current?.click();
                    }}
                    className="px-2 py-1 text-text-secondary hover:text-text-primary text-xs"
                    data-testid={`upload-logo-${team.id}`}
                  >
                    Logo
                  </button>
                  <button
                    onClick={() => {
                      setEditingTeam(team.id);
                      setEditName(team.name);
                      setEditAbbrev(team.abbreviation);
                    }}
                    className="px-2 py-1 text-text-secondary hover:text-text-primary text-xs"
                    data-testid={`edit-team-${team.id}`}
                  >
                    Edit
                  </button>
                  {confirmDelete === team.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(team.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                        data-testid={`confirm-delete-team-${team.id}`}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(team.id)}
                      className="px-2 py-1 text-red-400 hover:text-red-300 text-xs"
                      data-testid={`delete-team-${team.id}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
