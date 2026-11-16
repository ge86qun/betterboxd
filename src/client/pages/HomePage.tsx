import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, MessageSquare, Sparkles, Search, EyeOff } from 'lucide-react';
import { apiFetch, type MovieSummary, type ReviewItem } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { MovieCard } from '../components/MovieCard.js';
import { StarRating } from '../components/StarRating.js';

export function HomePage() {
  const { user } = useAuth();
  const [trending, setTrending] = useState<MovieSummary[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);
  const [feedMode, setFeedMode] = useState<'global' | 'friends'>('global');
  const [loading, setLoading] = useState(true);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [trendingRes, reviewsRes] = await Promise.all([
          apiFetch<{ results: MovieSummary[]; usingFallback?: boolean }>(
            '/movies/trending?window=week'
          ),
          apiFetch<{ reviews: ReviewItem[] }>(
            feedMode === 'friends' && user
              ? '/reviews/feed?limit=10'
              : '/reviews?limit=10'
          ),
        ]);
        if (!active) return;
        setTrending(trendingRes.results || []);
        setUsingFallback(Boolean(trendingRes.usingFallback));
        setRecentReviews(reviewsRes.reviews || []);
      } catch (err) {
        console.error('Failed to load home feed:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [feedMode, user]);

  return (
    <div className="space-y-8">
      {/* Velvet Curtain Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2b0b13] via-[#1c090e] to-[#120609] border border-rose-900/50 p-5 sm:p-8 shadow-xl shadow-black/40">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-amber-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Your Personal & Social Cinema Club</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {user
              ? `Welcome back, ${user.displayName || user.username}.`
              : 'Pull back the curtain on what your friends are watching.'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Rate films, keep your personal watchlist and watched history for friends, and curate collaborative shared watchlists with any group of friends.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-rose-950/60"
            >
              <Search className="w-4 h-4" />
              Find a Film to Log
            </Link>
            {!user && (
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#241016] hover:bg-rose-950/60 border border-rose-900/50 text-stone-100 font-medium text-xs sm:text-sm transition"
              >
                Create Free Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {usingFallback && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-200 flex items-center justify-between gap-2">
          <span>
            <strong>Demo Mode:</strong> Showing built-in sample films. Add{' '}
            <code className="px-1.5 py-0.5 rounded bg-[#1a0c10] text-amber-300">
              TMDB_API_KEY
            </code>{' '}
            to <code className="px-1.5 py-0.5 rounded bg-[#1a0c10]">.env</code> for live TMDB catalog searches.
          </span>
        </div>
      )}

      {/* Trending Movies Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Now Showing & Trending
            </h2>
          </div>
          <Link
            to="/search"
            className="text-xs font-medium text-rose-400 hover:text-rose-300"
          >
            Search catalog →
          </Link>
        </div>

        {loading && trending.length === 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-[2/3] rounded-xl bg-[#1a0c10] animate-pulse border border-rose-950/60"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {trending.slice(0, 12).map((movie) => (
              <MovieCard
                key={movie.tmdbId}
                tmdbId={movie.tmdbId}
                movie={movie}
              />
            ))}
          </div>
        )}
      </section>

      {/* Public & Friends Reviews Feed */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-rose-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Recent Reviews
            </h2>
          </div>

          {user && (
            <div className="inline-flex p-1 rounded-xl bg-[#1a0c10] border border-rose-950/80">
              <button
                type="button"
                onClick={() => setFeedMode('global')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  feedMode === 'global'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setFeedMode('friends')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  feedMode === 'friends'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Friends Feed
              </button>
            </div>
          )}
        </div>

        {recentReviews.length === 0 ? (
          <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-8 text-center text-sm text-stone-400">
            No reviews posted yet. Be the first to rate and review a film!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentReviews.map((rev) => {
              const isSpoilerHidden =
                rev.containsSpoilers && !revealedSpoilers[rev.id];

              return (
                <div
                  key={rev.id}
                  className="flex gap-3.5 p-4 rounded-2xl bg-[#1a0c10]/85 border border-rose-950/70 hover:border-rose-800/70 transition"
                >
                  <Link
                    to={`/movie/${rev.tmdbId}`}
                    className="w-16 sm:w-20 aspect-[2/3] rounded-lg overflow-hidden bg-[#120609] shrink-0 border border-rose-950/70"
                  >
                    {rev.movie?.posterUrl ? (
                      <img
                        src={rev.movie.posterUrl}
                        alt={rev.movie.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-500 p-1 text-center">
                        #{rev.tmdbId}
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/movie/${rev.tmdbId}`}
                        className="font-semibold text-sm sm:text-base text-white hover:text-rose-400 truncate"
                      >
                        {rev.movie?.title || `Movie #${rev.tmdbId}`}
                      </Link>
                      <span className="text-[11px] text-stone-500 shrink-0">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      {rev.user && (
                        <Link
                          to={`/profile/${rev.user.username}`}
                          className="text-xs font-medium text-rose-400 hover:underline"
                        >
                          @{rev.user.username}
                        </Link>
                      )}
                      {rev.rating !== null && (
                        <StarRating
                          value={rev.rating}
                          readOnly
                          size="sm"
                          showValue
                        />
                      )}
                    </div>

                    {rev.content && (
                      <div className="mt-2">
                        {isSpoilerHidden ? (
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedSpoilers((prev) => ({
                                ...prev,
                                [rev.id]: true,
                              }))
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            Contains spoilers — tap to reveal
                          </button>
                        ) : (
                          <p className="text-xs sm:text-sm text-stone-300 line-clamp-3 leading-relaxed">
                            {rev.content}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
