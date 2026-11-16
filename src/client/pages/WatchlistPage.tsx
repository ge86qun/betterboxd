import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Search, Trash2, Eye } from 'lucide-react';
import {
  apiFetch,
  type MovieSummary,
  type PaginationMeta,
} from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { MovieCard } from '../components/MovieCard.js';
import { Pagination } from '../components/Pagination.js';

interface WatchlistItem {
  id: number;
  tmdbId: number;
  notes: string | null;
  addedAt: string;
  movie: MovieSummary | null;
}

export function WatchlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadWatchlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiFetch<{
        items: WatchlistItem[];
        pagination: PaginationMeta;
      }>(`/users/${encodeURIComponent(user.username)}/watchlist?page=${page}&limit=24`);
      setItems(res.items || []);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const handleRemove = async (tmdbId: number) => {
    try {
      await apiFetch(`/me/watchlist/${tmdbId}`, { method: 'DELETE' });
      await loadWatchlist();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMarkWatched = async (tmdbId: number) => {
    try {
      await apiFetch('/me/watched', {
        method: 'POST',
        body: JSON.stringify({ tmdbId }),
      });
      await loadWatchlist();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-8 text-center space-y-3">
        <p className="text-sm text-stone-300">
          Sign in to view and manage your personal watchlist.
        </p>
        <Link
          to="/auth"
          className="inline-block px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Bookmark className="w-6 h-6 text-rose-400" />
            <span>My Watchlist</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
            Films you want to watch next. Visible to you and your accepted friends.
          </p>
        </div>

        <Link
          to="/search"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm self-start transition shadow-md shadow-rose-950/50"
        >
          <Search className="w-4 h-4" />
          Add Films
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-xl bg-[#1a0c10] animate-pulse border border-rose-950/60"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-[#1a0c10]/70 border border-rose-950/70 p-10 text-center space-y-3">
          <p className="text-sm text-stone-300">
            Your watchlist is empty. Browse movies to save them for later!
          </p>
          <Link
            to="/search"
            className="inline-block px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
          >
            Explore Movies
          </Link>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {items.map((item) => (
              <div key={item.id} className="relative group/item flex flex-col">
                <MovieCard
                  tmdbId={item.tmdbId}
                  movie={item.movie}
                  subtitle={item.notes || undefined}
                />
                <div className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
                  <button
                    type="button"
                    onClick={() => handleMarkWatched(item.tmdbId)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400 hover:text-amber-300 transition"
                    title="Mark as watched"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Watched
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.tmdbId)}
                    className="p-1 text-stone-500 hover:text-rose-400 transition"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
