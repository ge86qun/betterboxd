import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Film,
  UserPlus,
  LogOut,
  Users,
} from 'lucide-react';
import {
  apiFetch,
  type MovieSummary,
  type PaginationMeta,
} from '../lib/api.js';
import { Pagination } from '../components/Pagination.js';

interface SharedWatchlistItemRow {
  id: number;
  tmdbId: number;
  notes: string | null;
  isWatched: boolean;
  watchedAt: string | null;
  addedAt: string;
  addedBy: {
    id: number;
    username: string;
    displayName: string | null;
  };
  movie: MovieSummary | null;
}

export function SharedWatchlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [watchlist, setWatchlist] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [items, setItems] = useState<SharedWatchlistItemRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Add friends dropdown
  const [friends, setFriends] = useState<any[]>([]);
  const [showAddFriends, setShowAddFriends] = useState(false);

  const loadList = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [data, friendsRes] = await Promise.all([
        apiFetch<{
          sharedWatchlist: any;
          members: any[];
          items: SharedWatchlistItemRow[];
          pagination: PaginationMeta;
        }>(`/shared-watchlists/${id}?page=${page}&limit=24`),
        apiFetch<{ friends: any[] }>('/friends').catch(() => ({ friends: [] })),
      ]);

      setWatchlist(data.sharedWatchlist);
      setMembers(data.members || []);
      setItems(data.items || []);
      setPagination(data.pagination);
      setFriends(friendsRes.friends || []);
    } catch (err) {
      console.error(err);
      setWatchlist(null);
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleToggleWatched = async (tmdbId: number, current: boolean) => {
    if (!id) return;
    try {
      await apiFetch(`/shared-watchlists/${id}/items/${tmdbId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isWatched: !current }),
      });
      await loadList();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveItem = async (tmdbId: number) => {
    if (!id) return;
    try {
      await apiFetch(`/shared-watchlists/${id}/items/${tmdbId}`, {
        method: 'DELETE',
      });
      await loadList();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddFriendToWatchlist = async (friendUserId: number) => {
    if (!id) return;
    try {
      await apiFetch(`/shared-watchlists/${id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: friendUserId }),
      });
      await loadList();
      setShowAddFriends(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExitWatchlist = async () => {
    if (!id || !watchlist) return;
    if (!confirm(`Exit "${watchlist.name}"?`)) return;
    try {
      await apiFetch(`/shared-watchlists/${id}/members/me`, {
        method: 'DELETE',
      });
      navigate('/social');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-stone-400">
        Loading shared watchlist...
      </div>
    );
  }

  if (!watchlist) {
    return (
      <div className="rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-8 text-center text-sm text-stone-400">
        Shared watchlist not found or you do not have access.
      </div>
    );
  }

  const memberIds = new Set(members.map((m) => m.userId));
  const availableFriends = friends.filter((f) => !memberIds.has(f.user.id));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <Link
              to="/social"
              className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-rose-400"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Social
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {watchlist.name}
            </h1>
            {watchlist.description && (
              <p className="text-xs sm:text-sm text-stone-400">
                {watchlist.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
            >
              <Plus className="w-4 h-4" />
              Add Movies
            </Link>

            <button
              type="button"
              onClick={() => setShowAddFriends((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#120609] hover:bg-rose-950/50 border border-rose-950/80 text-stone-200 text-xs font-medium transition"
            >
              <UserPlus className="w-4 h-4 text-rose-400" />
              Add Friend
            </button>

            <button
              type="button"
              onClick={handleExitWatchlist}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#120609] hover:bg-rose-950/60 border border-rose-950/80 text-stone-400 hover:text-rose-300 text-xs font-medium transition"
            >
              <LogOut className="w-4 h-4" />
              Exit Watchlist
            </button>
          </div>
        </div>

        {/* Members Bar */}
        <div className="pt-3 border-t border-rose-950/60 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-stone-400 mr-1">
            <Users className="w-3.5 h-3.5 text-rose-400" />
            Members ({members.length}):
          </span>
          {members.map((m) => (
            <Link
              key={m.userId}
              to={`/profile/${m.user.username}`}
              className="px-2.5 py-1 rounded-lg bg-[#120609] border border-rose-950/80 text-xs text-stone-200 hover:border-rose-500/50 transition"
            >
              {m.user.displayName || m.user.username}{' '}
              <span className="text-stone-400">@{m.user.username}</span>
            </Link>
          ))}
        </div>

        {/* Add Friends Picker */}
        {showAddFriends && (
          <div className="p-3.5 rounded-xl bg-[#120609] border border-rose-950/80 space-y-2">
            <div className="text-xs font-semibold text-stone-300">
              Select a friend to add to "{watchlist.name}":
            </div>
            {availableFriends.length === 0 ? (
              <p className="text-xs text-stone-400">
                All of your accepted friends are already in this watchlist.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableFriends.map((f) => (
                  <button
                    key={f.user.id}
                    type="button"
                    onClick={() => handleAddFriendToWatchlist(f.user.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a0c10] hover:bg-rose-600/20 border border-rose-900/60 text-xs text-white transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-rose-400" />
                    {f.user.displayName || f.user.username} (@{f.user.username})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-10 text-center space-y-3">
          <p className="text-sm text-stone-400">
            No movies in this shared watchlist yet.
          </p>
          <Link
            to="/search"
            className="inline-block px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs"
          >
            Browse Movies to Add
          </Link>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex gap-3.5 p-3.5 rounded-2xl border transition ${
                  item.isWatched
                    ? 'bg-[#1a0c10]/40 border-rose-950/40 opacity-75'
                    : 'bg-[#1a0c10] border-rose-950/70'
                }`}
              >
                <Link
                  to={`/movie/${item.tmdbId}`}
                  className="w-20 aspect-[2/3] rounded-xl overflow-hidden bg-[#120609] shrink-0"
                >
                  {item.movie?.posterUrl ? (
                    <img
                      src={item.movie.posterUrl}
                      alt={item.movie.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-6 h-6 text-rose-900" />
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link
                      to={`/movie/${item.tmdbId}`}
                      className="font-bold text-sm text-white hover:text-rose-400 line-clamp-1"
                    >
                      {item.movie?.title || `Movie #${item.tmdbId}`}
                    </Link>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Added by @{item.addedBy.username}
                    </div>
                    {item.notes && (
                      <p className="mt-1.5 text-xs text-stone-300 italic line-clamp-2">
                        “{item.notes}”
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-rose-950/60 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleWatched(item.tmdbId, item.isWatched)
                      }
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        item.isWatched
                          ? 'text-amber-400'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      {item.isWatched ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Watched Together
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4" />
                          Mark Watched
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.tmdbId)}
                      className="p-1 text-stone-500 hover:text-rose-400"
                      title="Remove from list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
