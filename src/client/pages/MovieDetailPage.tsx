import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Eye,
  Bookmark,
  Heart,
  Share2,
  Clock,
  Calendar,
  Film,
  MessageSquare,
  Trash2,
  EyeOff,
  Check,
  Plus,
} from 'lucide-react';
import {
  apiFetch,
  type MovieDetail,
  type ReviewItem,
} from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { StarRating } from '../components/StarRating.js';

interface SharedWatchlistOption {
  id: number;
  name: string;
  contextLabel: string;
}

export function MovieDetailPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const { user } = useAuth();

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [communityStats, setCommunityStats] = useState<{
    reviewCount: number;
    ratedCount: number;
    averageRating: number | null;
    watchedCount: number;
  } | null>(null);
  const [viewerState, setViewerState] = useState<{
    watched: boolean;
    liked: boolean;
    rewatchCount: number;
    watchedAt: string | null;
    inWatchlist: boolean;
    myReview: ReviewItem | null;
  } | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [rating, setRating] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [liked, setLiked] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // Shared watchlist modal/dropdown state
  const [sharedLists, setSharedLists] = useState<SharedWatchlistOption[]>([]);
  const [showSharedMenu, setShowSharedMenu] = useState(false);
  const [sharedFeedback, setSharedFeedback] = useState<string | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<number, boolean>>({});

  const loadMovie = useCallback(async () => {
    if (!tmdbId) return;
    setLoading(true);
    try {
      const data = await apiFetch<{
        movie: MovieDetail;
        communityStats: any;
        viewerState: any;
        reviews: ReviewItem[];
      }>(`/movies/${tmdbId}`);

      setMovie(data.movie);
      setCommunityStats(data.communityStats);
      setViewerState(data.viewerState);
      setReviews(data.reviews || []);

      if (data.viewerState) {
        setLiked(Boolean(data.viewerState.liked));
        if (data.viewerState.myReview) {
          setRating(data.viewerState.myReview.rating);
          setContent(data.viewerState.myReview.content || '');
          setContainsSpoilers(Boolean(data.viewerState.myReview.containsSpoilers));
        } else {
          setRating(null);
          setContent('');
          setContainsSpoilers(false);
        }
      }
    } catch (err) {
      console.error('Failed to load movie detail:', err);
    } finally {
      setLoading(false);
    }
  }, [tmdbId]);

  useEffect(() => {
    loadMovie();
  }, [loadMovie]);

  useEffect(() => {
    if (user) {
      apiFetch<{ sharedWatchlists: SharedWatchlistOption[] }>('/shared-watchlists')
        .then((res) => setSharedLists(res.sharedWatchlists || []))
        .catch(() => {});
    }
  }, [user]);

  const handleToggleWatched = async () => {
    if (!user || !movie) return;
    try {
      if (viewerState?.watched) {
        await apiFetch(`/me/watched/${movie.tmdbId}`, { method: 'DELETE' });
      } else {
        await apiFetch('/me/watched', {
          method: 'POST',
          body: JSON.stringify({ tmdbId: movie.tmdbId, liked }),
        });
      }
      await loadMovie();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!user || !movie) return;
    try {
      if (viewerState?.inWatchlist) {
        await apiFetch(`/me/watchlist/${movie.tmdbId}`, { method: 'DELETE' });
      } else {
        await apiFetch('/me/watchlist', {
          method: 'POST',
          body: JSON.stringify({ tmdbId: movie.tmdbId }),
        });
      }
      await loadMovie();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleLike = async () => {
    if (!user || !movie) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    if (viewerState?.watched) {
      try {
        await apiFetch(`/me/watched/${movie.tmdbId}`, {
          method: 'PATCH',
          body: JSON.stringify({ liked: nextLiked }),
        });
        await loadMovie();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !movie) return;
    setSubmittingReview(true);
    setReviewMessage(null);

    try {
      if (viewerState?.myReview) {
        await apiFetch(`/reviews/${viewerState.myReview.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            rating,
            content,
            containsSpoilers,
          }),
        });
        setReviewMessage('Review updated!');
      } else {
        await apiFetch('/reviews', {
          method: 'POST',
          body: JSON.stringify({
            tmdbId: movie.tmdbId,
            rating,
            content,
            containsSpoilers,
            liked,
            markAsWatched: true,
          }),
        });
        setReviewMessage('Review published & friends notified!');
      }
      await loadMovie();
    } catch (err: any) {
      setReviewMessage(err.message || 'Failed to save review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Delete your review?')) return;
    try {
      await apiFetch(`/reviews/${reviewId}`, { method: 'DELETE' });
      await loadMovie();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddToSharedList = async (listId: number) => {
    if (!movie) return;
    try {
      await apiFetch(`/shared-watchlists/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify({ tmdbId: movie.tmdbId }),
      });
      setSharedFeedback('Added to shared watchlist!');
      setShowSharedMenu(false);
      setTimeout(() => setSharedFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-56 sm:h-72 rounded-2xl bg-[#1a0c10] border border-rose-950/60" />
        <div className="h-40 rounded-2xl bg-[#1a0c10] border border-rose-950/60" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="text-center py-12 text-stone-400">
        Movie not found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Backdrop & Header Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-[#1a0c10] border border-rose-950/70">
        {movie.backdropUrl && (
          <div className="relative h-48 sm:h-72 w-full overflow-hidden">
            <img
              src={movie.backdropUrl}
              alt={movie.title}
              className="w-full h-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a0c10] via-[#1a0c10]/70 to-transparent" />
          </div>
        )}

        <div
          className={`p-5 sm:p-8 flex flex-col sm:flex-row gap-6 ${
            movie.backdropUrl ? '-mt-24 sm:-mt-32 relative z-10' : ''
          }`}
        >
          {/* Poster */}
          <div className="w-32 sm:w-44 aspect-[2/3] rounded-xl overflow-hidden bg-[#120609] border-2 border-rose-900/60 shadow-2xl shrink-0 mx-auto sm:mx-0">
            {movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-10 h-10 text-rose-900" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="flex flex-wrap items-baseline justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {movie.title}
              </h1>
              {movie.releaseYear && (
                <span className="text-base sm:text-lg text-stone-400 font-medium">
                  ({movie.releaseYear})
                </span>
              )}
            </div>

            {movie.tagline && (
              <p className="text-xs sm:text-sm italic text-amber-300/90">
                “{movie.tagline}”
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-stone-300">
              {movie.directors.length > 0 && (
                <span>
                  Directed by{' '}
                  <strong className="text-white">
                    {movie.directors.map((d) => d.name).join(', ')}
                  </strong>
                </span>
              )}
              {movie.runtime && (
                <span className="inline-flex items-center gap-1 text-stone-400">
                  <Clock className="w-3.5 h-3.5" />
                  {movie.runtime} mins
                </span>
              )}
              {movie.releaseDate && (
                <span className="inline-flex items-center gap-1 text-stone-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {movie.releaseDate}
                </span>
              )}
            </div>

            {movie.genres.length > 0 && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-900/60 text-[11px] text-rose-200"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl">
              {movie.overview}
            </p>

            {/* Community Stats Pills */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-[#120609]/90 border border-rose-950/80 flex items-center gap-2">
                <span className="text-stone-400">Avg Rating:</span>
                <span className="font-bold text-amber-400">
                  {communityStats?.averageRating !== null &&
                  communityStats?.averageRating !== undefined
                    ? `${communityStats.averageRating.toFixed(2)} ★`
                    : 'No ratings yet'}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#120609]/90 border border-rose-950/80 text-stone-300">
                <strong>{communityStats?.watchedCount ?? 0}</strong> watched
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#120609]/90 border border-rose-950/80 text-stone-300">
                <strong>{communityStats?.reviewCount ?? 0}</strong> reviews
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Bar & Log/Review Form */}
      {user ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Action Buttons Card */}
          <div className="rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              Your Activity
            </h2>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleToggleWatched}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition ${
                  viewerState?.watched
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#120609] border-rose-950/80 text-stone-400 hover:text-white'
                }`}
              >
                <Eye className="w-5 h-5" />
                <span>{viewerState?.watched ? 'Watched' : 'Watch'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleLike}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition ${
                  liked
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-[#120609] border-rose-950/80 text-stone-400 hover:text-white'
                }`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-rose-400' : ''}`} />
                <span>{liked ? 'Liked' : 'Like'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleWatchlist}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition ${
                  viewerState?.inWatchlist
                    ? 'bg-rose-600/25 border-rose-500 text-rose-200'
                    : 'bg-[#120609] border-rose-950/80 text-stone-400 hover:text-white'
                }`}
              >
                <Bookmark className="w-5 h-5" />
                <span>
                  {viewerState?.inWatchlist ? 'Watchlisted' : 'Watchlist'}
                </span>
              </button>
            </div>

            {/* Add to Shared Watchlist Dropdown */}
            <div className="relative pt-2 border-t border-rose-950/70">
              <button
                type="button"
                onClick={() => setShowSharedMenu((prev) => !prev)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#120609] hover:bg-rose-950/40 border border-rose-950/80 text-xs font-medium text-stone-200 flex items-center justify-between transition"
              >
                <span className="inline-flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-rose-400" />
                  Add to Shared Watchlist
                </span>
                <Plus className="w-4 h-4 text-stone-400" />
              </button>

              {sharedFeedback && (
                <p className="mt-2 text-xs text-amber-300 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {sharedFeedback}
                </p>
              )}

              {showSharedMenu && (
                <div className="mt-2 rounded-xl bg-[#120609] border border-rose-950/80 p-2 space-y-1 shadow-xl">
                  {sharedLists.length === 0 ? (
                    <div className="p-2 text-xs text-stone-400 text-center">
                      No shared watchlists yet.{' '}
                      <Link to="/social" className="text-rose-400 underline">
                        Create one in Social
                      </Link>
                    </div>
                  ) : (
                    sharedLists.map((list) => (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => handleAddToSharedList(list.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-950/40 text-xs flex items-center justify-between"
                      >
                        <span className="font-medium text-white truncate">
                          {list.name}
                        </span>
                        <span className="text-[10px] text-stone-400 ml-2 shrink-0">
                          {list.contextLabel}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rating & Public Review Form */}
          <form
            onSubmit={handleSubmitReview}
            className="lg:col-span-2 rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
                {viewerState?.myReview
                  ? 'Update Your Public Review'
                  : 'Rate & Write a Public Review'}
              </h2>

              {viewerState?.myReview && (
                <button
                  type="button"
                  onClick={() => handleDeleteReview(viewerState.myReview!.id)}
                  className="inline-flex items-center gap-1 text-xs text-rose-400 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Review
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-[#120609] border border-rose-950/80">
              <div className="text-sm font-semibold text-stone-200">
                Rating
              </div>
              <StarRating
                value={rating}
                onChange={setRating}
                size="lg"
                showValue
              />
            </div>

            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Write your thoughts on ${movie.title}...`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#120609] border border-rose-950/80 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={containsSpoilers}
                  onChange={(e) => setContainsSpoilers(e.target.checked)}
                  className="rounded border-rose-900 bg-[#120609] text-rose-600 focus:ring-rose-500"
                />
                <span>Contains spoilers</span>
              </label>

              <div className="flex items-center gap-3">
                {reviewMessage && (
                  <span className="text-xs text-amber-300">
                    {reviewMessage}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm transition disabled:opacity-50 shadow-md shadow-rose-950/50"
                >
                  {submittingReview
                    ? 'Saving...'
                    : viewerState?.myReview
                    ? 'Update Review'
                    : 'Post Public Review'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-5 flex items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-stone-300">
            Sign in to rate <strong>{movie.title}</strong>, log it to your watched list, or add it to a shared watchlist.
          </p>
          <Link
            to="/auth"
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs shrink-0"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Cast Horizontal Strip */}
      {movie.cast.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-white mb-3">Top Cast</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {movie.cast.slice(0, 6).map((actor) => (
              <div
                key={actor.id}
                className="p-3 rounded-xl bg-[#1a0c10]/90 border border-rose-950/70 text-xs"
              >
                <div className="font-semibold text-stone-100 truncate">
                  {actor.name}
                </div>
                <div className="text-stone-400 truncate mt-0.5">
                  {actor.character}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Public Reviews Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-rose-400" />
          <h2 className="text-base sm:text-lg font-bold text-white">
            Public Reviews ({reviews.length})
          </h2>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-8 text-center text-sm text-stone-400">
            No reviews yet for {movie.title}. Be the first to share your rating!
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => {
              const hideSpoiler =
                rev.containsSpoilers && !revealedSpoilers[rev.id];

              return (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-[#1a0c10]/90 border border-rose-950/70 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {rev.user && (
                        <Link
                          to={`/profile/${rev.user.username}`}
                          className="font-semibold text-sm text-rose-400 hover:underline"
                        >
                          {rev.user.displayName || rev.user.username}{' '}
                          <span className="text-xs font-normal text-stone-400">
                            @{rev.user.username}
                          </span>
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
                    <span className="text-xs text-stone-500">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {rev.content && (
                    <div>
                      {hideSpoiler ? (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedSpoilers((prev) => ({
                              ...prev,
                              [rev.id]: true,
                            }))
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          Spoiler warning — click to view review
                        </button>
                      ) : (
                        <p className="text-xs sm:text-sm text-stone-200 whitespace-pre-line leading-relaxed">
                          {rev.content}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
