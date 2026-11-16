import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Eye,
  Bookmark,
  MessageSquare,
  Lock,
  UserPlus,
  Check,
  Clock,
} from 'lucide-react';
import {
  apiFetch,
  type User,
  type MovieSummary,
  type ReviewItem,
  type PaginationMeta,
} from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { MovieCard } from '../components/MovieCard.js';
import { Pagination } from '../components/Pagination.js';
import { StarRating } from '../components/StarRating.js';

interface WatchedListItem {
  id: number;
  tmdbId: number;
  watchedAt: string;
  liked: boolean;
  rewatchCount: number;
  rating: number | null;
  movie: MovieSummary | null;
}

interface WatchlistItem {
  id: number;
  tmdbId: number;
  notes: string | null;
  addedAt: string;
  movie: MovieSummary | null;
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [relationship, setRelationship] = useState<{
    status: 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none';
    friendshipId: number | null;
    canViewPrivateLists: boolean;
  } | null>(null);
  const [stats, setStats] = useState<{
    reviewCount: number;
    friendsCount: number;
    watchedCount: number | null;
    watchlistCount: number | null;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'reviews' | 'watched' | 'watchlist'>(
    'reviews'
  );
  const [page, setPage] = useState(1);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [watchedItems, setWatchedItems] = useState<WatchedListItem[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);

  const loadProfileHeader = useCallback(async () => {
    if (!username) return;
    setLoadingProfile(true);
    try {
      const data = await apiFetch<{
        user: User;
        relationship: any;
        stats: any;
      }>(`/users/${username}`);
      setProfileUser(data.user);
      setRelationship(data.relationship);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
      setProfileUser(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [username]);

  useEffect(() => {
    setPage(1);
    setActiveTab('reviews');
    loadProfileHeader();
  }, [loadProfileHeader]);

  useEffect(() => {
    if (!username || !profileUser) return;
    let active = true;

    async function loadTabContent() {
      setLoadingTab(true);
      try {
        if (activeTab === 'reviews') {
          const res = await apiFetch<{
            reviews: ReviewItem[];
            pagination: PaginationMeta;
          }>(`/reviews?username=${encodeURIComponent(username!)}&page=${page}&limit=20`);
          if (!active) return;
          setReviews(res.reviews || []);
          setPagination(res.pagination);
        } else if (activeTab === 'watched' && relationship?.canViewPrivateLists) {
          const res = await apiFetch<{
            items: WatchedListItem[];
            pagination: PaginationMeta;
          }>(`/users/${encodeURIComponent(username!)}/watched?page=${page}&limit=24`);
          if (!active) return;
          setWatchedItems(res.items || []);
          setPagination(res.pagination);
        } else if (activeTab === 'watchlist' && relationship?.canViewPrivateLists) {
          const res = await apiFetch<{
            items: WatchlistItem[];
            pagination: PaginationMeta;
          }>(`/users/${encodeURIComponent(username!)}/watchlist?page=${page}&limit=24`);
          if (!active) return;
          setWatchlistItems(res.items || []);
          setPagination(res.pagination);
        } else {
          setPagination(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingTab(false);
      }
    }

    loadTabContent();
    return () => {
      active = false;
    };
  }, [username, profileUser, activeTab, page, relationship?.canViewPrivateLists]);

  const handleSendFriendRequest = async () => {
    if (!profileUser) return;
    try {
      await apiFetch(`/friends/request/${profileUser.id}`, { method: 'POST' });
      await loadProfileHeader();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAcceptRequest = async () => {
    if (!relationship?.friendshipId) return;
    try {
      await apiFetch(`/friends/respond/${relationship.friendshipId}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'accept' }),
      });
      await loadProfileHeader();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loadingProfile) {
    return (
      <div className="h-48 rounded-2xl bg-[#1a0c10] animate-pulse border border-rose-950/60" />
    );
  }

  if (!profileUser) {
    return (
      <div className="rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-10 text-center text-stone-400">
        User @{username} not found.
      </div>
    );
  }

  const canViewLists = Boolean(relationship?.canViewPrivateLists);

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-300 font-bold text-2xl sm:text-3xl shrink-0">
            {(profileUser.displayName || profileUser.username)[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {profileUser.displayName || profileUser.username}
            </h1>
            <p className="text-xs sm:text-sm text-stone-400">
              @{profileUser.username}
            </p>
            {profileUser.bio && (
              <p className="mt-2 text-xs sm:text-sm text-stone-300 max-w-xl">
                {profileUser.bio}
              </p>
            )}
          </div>
        </div>

        {/* Stats & Relationship Action */}
        <div className="flex flex-col sm:items-end gap-3">
          {currentUser && relationship?.status !== 'self' && (
            <div>
              {relationship?.status === 'friends' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  <Check className="w-4 h-4" />
                  Friends
                </span>
              ) : relationship?.status === 'pending_sent' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#120609] text-stone-300 text-xs font-medium">
                  <Clock className="w-4 h-4" />
                  Friend Request Sent
                </span>
              ) : relationship?.status === 'pending_received' ? (
                <button
                  type="button"
                  onClick={handleAcceptRequest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
                >
                  <Check className="w-4 h-4" />
                  Accept Friend Request
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendFriendRequest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Friend
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="px-3 py-2 rounded-xl bg-[#120609] border border-rose-950/80">
              <div className="text-sm sm:text-base font-bold text-white">
                {stats?.reviewCount ?? 0}
              </div>
              <div className="text-[11px] text-stone-400">Reviews</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#120609] border border-rose-950/80">
              <div className="text-sm sm:text-base font-bold text-white">
                {canViewLists ? (stats?.watchedCount ?? 0) : '🔒'}
              </div>
              <div className="text-[11px] text-stone-400">Watched</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#120609] border border-rose-950/80">
              <div className="text-sm sm:text-base font-bold text-white">
                {canViewLists ? (stats?.watchlistCount ?? 0) : '🔒'}
              </div>
              <div className="text-[11px] text-stone-400">Watchlist</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-rose-950/70 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab('reviews');
            setPage(1);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'reviews'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
              : 'bg-[#1a0c10] text-stone-300 hover:text-white border border-rose-950/60'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Public Reviews ({stats?.reviewCount ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('watched');
            setPage(1);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'watched'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
              : 'bg-[#1a0c10] text-stone-300 hover:text-white border border-rose-950/60'
          }`}
        >
          {canViewLists ? (
            <Eye className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4 text-amber-400" />
          )}
          <span>
            Watched List {canViewLists ? `(${stats?.watchedCount ?? 0})` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('watchlist');
            setPage(1);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'watchlist'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
              : 'bg-[#1a0c10] text-stone-300 hover:text-white border border-rose-950/60'
          }`}
        >
          {canViewLists ? (
            <Bookmark className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4 text-amber-400" />
          )}
          <span>
            Watchlist {canViewLists ? `(${stats?.watchlistCount ?? 0})` : ''}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab !== 'reviews' && !canViewLists ? (
        <div className="rounded-2xl bg-[#1a0c10]/85 border border-rose-950/70 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Friends-Only List
          </h3>
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
            @{profileUser.username}’s Watched List and Watchlist are private to accepted friends. Their reviews remain public!
          </p>
          {currentUser && relationship?.status === 'none' && (
            <button
              type="button"
              onClick={handleSendFriendRequest}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs"
            >
              <UserPlus className="w-4 h-4" />
              Send Friend Request
            </button>
          )}
        </div>
      ) : loadingTab ? (
        <div className="py-12 text-center text-sm text-stone-400">
          Loading...
        </div>
      ) : activeTab === 'reviews' ? (
        reviews.length === 0 ? (
          <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-8 text-center text-sm text-stone-400">
            No public reviews yet.
          </div>
        ) : (
          <div>
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="flex gap-4 p-4 rounded-2xl bg-[#1a0c10] border border-rose-950/70"
                >
                  <Link
                    to={`/movie/${rev.tmdbId}`}
                    className="w-16 sm:w-20 aspect-[2/3] rounded-lg overflow-hidden bg-[#120609] shrink-0"
                  >
                    {rev.movie?.posterUrl && (
                      <img
                        src={rev.movie.posterUrl}
                        alt={rev.movie.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/movie/${rev.tmdbId}`}
                        className="font-bold text-sm sm:text-base text-white hover:text-rose-400 truncate"
                      >
                        {rev.movie?.title || `Movie #${rev.tmdbId}`}
                      </Link>
                      <span className="text-xs text-stone-500">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {rev.rating !== null && (
                      <StarRating
                        value={rev.rating}
                        readOnly
                        size="sm"
                        showValue
                      />
                    )}
                    {rev.content && (
                      <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                        {rev.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        )
      ) : activeTab === 'watched' ? (
        watchedItems.length === 0 ? (
          <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-8 text-center text-sm text-stone-400">
            No watched movies logged yet.
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
              {watchedItems.map((item) => (
                <MovieCard
                  key={item.id}
                  tmdbId={item.tmdbId}
                  movie={item.movie}
                  rating={item.rating}
                  liked={item.liked}
                />
              ))}
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        )
      ) : watchlistItems.length === 0 ? (
        <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-8 text-center text-sm text-stone-400">
          Watchlist is currently empty.
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {watchlistItems.map((item) => (
              <MovieCard
                key={item.id}
                tmdbId={item.tmdbId}
                movie={item.movie}
                subtitle={item.notes || undefined}
              />
            ))}
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
