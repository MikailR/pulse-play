'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getSports, getSportCategories,
  createSport, updateSport, deleteSport,
  createCategory, updateCategory, deleteCategory,
} from '@/lib/api';
import type { Sport, MarketCategory } from '@/lib/types';

export function SportsPanel() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [categories, setCategories] = useState<Record<string, MarketCategory[]>>({});
  const [expandedSport, setExpandedSport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create sport form
  const [showCreateSport, setShowCreateSport] = useState(false);
  const [newSportName, setNewSportName] = useState('');
  const [newSportDesc, setNewSportDesc] = useState('');

  // Edit sport
  const [editingSport, setEditingSport] = useState<string | null>(null);
  const [editSportName, setEditSportName] = useState('');
  const [editSportDesc, setEditSportDesc] = useState('');

  // Create category form
  const [showCreateCat, setShowCreateCat] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatOutcomes, setNewCatOutcomes] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Edit category
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');

  // Confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSports();
      setSports(data.sports);
      const catMap: Record<string, MarketCategory[]> = {};
      for (const sport of data.sports) {
        try {
          const catData = await getSportCategories(sport.id);
          catMap[sport.id] = catData.categories;
        } catch {
          catMap[sport.id] = [];
        }
      }
      setCategories(catMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSport = async () => {
    if (!newSportName.trim()) return;
    setActionError(null);
    try {
      await createSport(newSportName.trim(), newSportDesc.trim() || undefined);
      setNewSportName('');
      setNewSportDesc('');
      setShowCreateSport(false);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create sport');
    }
  };

  const handleUpdateSport = async (sportId: string) => {
    setActionError(null);
    try {
      await updateSport(sportId, {
        name: editSportName.trim() || undefined,
        description: editSportDesc.trim() || undefined,
      });
      setEditingSport(null);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update sport');
    }
  };

  const handleDeleteSport = async (sportId: string) => {
    setActionError(null);
    try {
      await deleteSport(sportId);
      setConfirmDelete(null);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete sport');
    }
  };

  const handleCreateCategory = async (sportId: string) => {
    if (!newCatName.trim() || !newCatOutcomes.trim()) return;
    const outcomes = newCatOutcomes.split(',').map((s) => s.trim()).filter(Boolean);
    if (outcomes.length < 2) {
      setActionError('At least 2 outcomes required');
      return;
    }
    setActionError(null);
    try {
      await createCategory(sportId, newCatName.trim(), outcomes, newCatDesc.trim() || undefined);
      setNewCatName('');
      setNewCatOutcomes('');
      setNewCatDesc('');
      setShowCreateCat(null);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleUpdateCategory = async (sportId: string, categoryId: string) => {
    setActionError(null);
    try {
      await updateCategory(sportId, categoryId, {
        name: editCatName.trim() || undefined,
        description: editCatDesc.trim() || undefined,
      });
      setEditingCat(null);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (sportId: string, categoryId: string) => {
    setActionError(null);
    try {
      await deleteCategory(sportId, categoryId);
      setConfirmDelete(null);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3" data-testid="sports-panel-loading">
        <div className="h-12 bg-surface-input rounded" />
        <div className="h-12 bg-surface-input rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="sports-error" className="text-center py-8">
        <p className="text-red-400 text-sm mb-3">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-surface-raised text-text-primary rounded text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div data-testid="sports-panel">
      <div className="flex items-center justify-between mb-4">
        <span className="text-text-muted text-sm">{sports.length} sport(s)</span>
        <button
          onClick={() => setShowCreateSport(!showCreateSport)}
          className="text-sm text-accent hover:text-accent-hover"
          data-testid="toggle-create-sport"
        >
          {showCreateSport ? 'Cancel' : '+ New Sport'}
        </button>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-2 mb-4 text-sm text-red-400" data-testid="sport-action-error">
          {actionError}
        </div>
      )}

      {showCreateSport && (
        <div className="bg-surface-overlay rounded-lg p-4 mb-4 space-y-2" data-testid="create-sport-form">
          <input
            placeholder="Sport name"
            value={newSportName}
            onChange={(e) => setNewSportName(e.target.value)}
            className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm placeholder-text-muted"
            data-testid="create-sport-name"
          />
          <input
            placeholder="Description (optional)"
            value={newSportDesc}
            onChange={(e) => setNewSportDesc(e.target.value)}
            className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm placeholder-text-muted"
            data-testid="create-sport-desc"
          />
          <button
            onClick={handleCreateSport}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
            data-testid="create-sport-submit"
          >
            Create Sport
          </button>
        </div>
      )}

      <div className="space-y-2">
        {sports.map((sport) => (
          <div key={sport.id} className="bg-surface-raised border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setExpandedSport(expandedSport === sport.id ? null : sport.id)}
                className="flex-1 flex items-center text-left hover:bg-surface-overlay transition-colors -mx-4 -my-3 px-4 py-3"
                data-testid={`sport-row-${sport.id}`}
              >
                <div className="flex-1">
                  {editingSport === sport.id ? (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editSportName}
                        onChange={(e) => setEditSportName(e.target.value)}
                        className="bg-surface-input text-text-primary rounded px-2 py-1 text-sm"
                        data-testid="edit-sport-name"
                      />
                      <input
                        value={editSportDesc}
                        onChange={(e) => setEditSportDesc(e.target.value)}
                        placeholder="Description"
                        className="bg-surface-input text-text-primary rounded px-2 py-1 text-sm flex-1"
                        data-testid="edit-sport-desc"
                      />
                      <button
                        onClick={() => handleUpdateSport(sport.id)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                        data-testid="save-sport"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSport(null)}
                        className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-text-primary font-medium">{sport.name}</span>
                      {sport.description && (
                        <span className="text-text-muted text-sm ml-2">{sport.description}</span>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted text-sm">
                    {categories[sport.id]?.length ?? 0} categories
                  </span>
                  <span className="text-text-muted">{expandedSport === sport.id ? '\u2212' : '+'}</span>
                </div>
              </button>
              {editingSport !== sport.id && (
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSport(sport.id);
                      setEditSportName(sport.name);
                      setEditSportDesc(sport.description ?? '');
                    }}
                    className="px-2 py-1 text-text-secondary hover:text-text-primary text-xs"
                    data-testid={`edit-sport-${sport.id}`}
                  >
                    Edit
                  </button>
                  {confirmDelete === `sport-${sport.id}` ? (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSport(sport.id); }}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                        data-testid={`confirm-delete-sport-${sport.id}`}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                        className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(`sport-${sport.id}`); }}
                      className="px-2 py-1 text-red-400 hover:text-red-300 text-xs"
                      data-testid={`delete-sport-${sport.id}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {expandedSport === sport.id && (
              <div className="px-4 pb-3 border-t border-border" data-testid={`sport-categories-${sport.id}`}>
                <div className="flex justify-end mt-2 mb-2">
                  <button
                    onClick={() => setShowCreateCat(showCreateCat === sport.id ? null : sport.id)}
                    className="text-xs text-accent hover:text-accent-hover"
                    data-testid={`toggle-create-cat-${sport.id}`}
                  >
                    {showCreateCat === sport.id ? 'Cancel' : '+ Add Category'}
                  </button>
                </div>

                {showCreateCat === sport.id && (
                  <div className="bg-surface-overlay rounded p-3 mb-3 space-y-2" data-testid="create-cat-form">
                    <input
                      placeholder="Category name"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm placeholder-text-muted"
                      data-testid="create-cat-name"
                    />
                    <input
                      placeholder="Outcomes (comma-separated, e.g. BALL,STRIKE)"
                      value={newCatOutcomes}
                      onChange={(e) => setNewCatOutcomes(e.target.value)}
                      className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm placeholder-text-muted"
                      data-testid="create-cat-outcomes"
                    />
                    <input
                      placeholder="Description (optional)"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      className="w-full bg-surface-input text-text-primary rounded px-3 py-2 text-sm placeholder-text-muted"
                      data-testid="create-cat-desc"
                    />
                    <button
                      onClick={() => handleCreateCategory(sport.id)}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
                      data-testid="create-cat-submit"
                    >
                      Create Category
                    </button>
                  </div>
                )}

                {(categories[sport.id] ?? []).length === 0 ? (
                  <p className="text-text-muted text-sm py-2">No categories.</p>
                ) : (
                  (categories[sport.id] ?? []).map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between py-2 text-sm"
                      data-testid={`category-row-${cat.id}`}
                    >
                      <div className="flex-1">
                        {editingCat === cat.id ? (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              value={editCatName}
                              onChange={(e) => setEditCatName(e.target.value)}
                              className="bg-surface-input text-text-primary rounded px-2 py-1 text-sm"
                              data-testid="edit-cat-name"
                            />
                            <input
                              value={editCatDesc}
                              onChange={(e) => setEditCatDesc(e.target.value)}
                              placeholder="Description"
                              className="bg-surface-input text-text-primary rounded px-2 py-1 text-sm flex-1"
                              data-testid="edit-cat-desc"
                            />
                            <button
                              onClick={() => handleUpdateCategory(sport.id, cat.id)}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                              data-testid="save-cat"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCat(null)}
                              className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-text-secondary capitalize">{cat.name}</span>
                            {cat.description && (
                              <span className="text-text-muted ml-2">{cat.description}</span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {cat.outcomes.map((o) => (
                            <span
                              key={o}
                              className="px-2 py-0.5 bg-surface-input rounded text-xs text-text-secondary"
                            >
                              {o}
                            </span>
                          ))}
                        </div>
                        {editingCat !== cat.id && (
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => {
                                setEditingCat(cat.id);
                                setEditCatName(cat.name);
                                setEditCatDesc(cat.description ?? '');
                              }}
                              className="px-2 py-1 text-text-secondary hover:text-text-primary text-xs"
                              data-testid={`edit-cat-${cat.id}`}
                            >
                              Edit
                            </button>
                            {confirmDelete === `cat-${cat.id}` ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleDeleteCategory(sport.id, cat.id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                                  data-testid={`confirm-delete-cat-${cat.id}`}
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
                                onClick={() => setConfirmDelete(`cat-${cat.id}`)}
                                className="px-2 py-1 text-red-400 hover:text-red-300 text-xs"
                                data-testid={`delete-cat-${cat.id}`}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
