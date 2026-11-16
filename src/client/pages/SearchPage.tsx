import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Film, Users, UserPlus, Check, Clock } from 'lucide-react';
import { apiFetch, type MovieSummary, type User } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { MovieCard } from '../components/MovieCard.js';

interface UserSearchResult extends User {
  friendshipStatus: 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none';
  friendshipId: number | null;
}

export function SearchPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialTab = searchParams.get('tab') === 'users' ? 'users' : 'movies';

  const [tab, setTab] = useState<'movies' | 'users'>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [usersList, setUsersList] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (tab === 'movies') {
        setLoading(true);
        try {
          const endpoint = query.trim()
            ? `/movies/search?q=${encodeURIComponent(query.trim())}`
            : '/movies/trending?window=week';
          const data = await apiFetch<{ results: MovieSummary[] }>(endpoint);
          if (active) setMovies(data.results || []);
        } catch (err) {
          console.error(err);
        } finally {
          if (active) setLoading(false);
        }
      } else if (tab === 'users' && user) {
        setLoading(true);
        try {
          const data = await apiFetch<{ results: UserSearchResult[] }>(
            `/users/search?q=${encodeURIComponent(query.trim())}`
          );
          if (active) setUsersList(data.results || []);
        } catch (err) {
          console.error(err);
        } finally {
          if (active) setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, tab, user]);

  const handleSendFriendRequest = async (targetUserId: number) => {
    try {
      const res = await apiFetch<{ friendship: { id: number } }>(
        `/friends/request/${targetUserId}`,
        { method: 'POST' }
      );
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? {
                ...u,
                friendshipStatus: 'pending_sent',
                friendshipId: res.friendship.id,
              }
            : u
        )
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Explore & Search
          </h1>
          <p className="text-xs sm:text-sm text-stone-400">
            Search the TMDB movie catalog or find friends on Betterboxd.
          </p>
        </div>

        {/* Movies vs Users Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-[#1a0c10] border border-rose-950/80 self-start">
          <button
            type="button"
            onClick={() => {
              setTab('movies');
              setSearchParams({ q: query, tab: 'movies' });
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              tab === 'movies'
                ? 'bg-rose-600 text-white font-semibold'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            Movies
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('users');
              setSearchParams({ q: query, tab: 'users' });
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              tab === 'users'
                ? 'bg-rose-600 text-white font-semibold'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Members
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchParams({ q: e.target.value, tab });
          }}
          placeholder={
            tab === 'movies'
              ? 'Search movies by title (e.g., Inception, Interstellar, Parasite, Dune)...'
              : 'Search Betterboxd users by username or display name...'
          }
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#1a0c10] border border-rose-950/80 text-sm sm:text-base text-white placeholder-stone-500 focus:outline-none focus:border-rose-500 shadow-inner"
        />
      </div>

      {/* Results */}
      {tab === 'movies' ? (
        loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-xl bg-[#1a0c10] animate-pulse border border-rose-950/60"
              />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-10 text-center text-sm text-stone-400">
            No movies found matching "{query}".
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {movies.map((m) => (
              <MovieCard key={m.tmdbId} tmdbId={m.tmdbId} movie={m} />
            ))}
          </div>
        )
      ) : !user ? (
        <div className="rounded-2xl bg-[#1a0c10]/70 border border-rose-950/70 p-8 text-center space-y-3">
          <p className="text-sm text-stone-300">
            Sign in to search for members and send friend requests.
          </p>
          <Link
            to="/auth"
            className="inline-block px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs"
          >
            Sign In
          </Link>
        </div>
      ) : loading ? (
        <div className="text-sm text-stone-400 py-8 text-center">
          Searching members...
        </div>
      ) : usersList.length === 0 ? (
        <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-10 text-center text-sm text-stone-400">
          No members found matching "{query}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {usersList.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#1a0c10] border border-rose-950/70"
            >
              <Link
                to={`/profile/${u.username}`}
                className="flex items-center gap-3 min-w-0 group"
              >
                <div className="w-11 h-11 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-300 font-bold text-base shrink-0">
                  {(u.displayName || u.username)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white group-hover:text-rose-400 truncate">
                    {u.displayName || u.username}
                  </div>
                  <div className="text-xs text-stone-400 truncate">
                    @{u.username}
                  </div>
                </div>
              </Link>

              <div>
                {u.friendshipStatus === 'friends' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 text-xs font-medium">
                    <Check className="w-3.5 h-3.5" />
                    Friends
                  </span>
                ) : u.friendshipStatus === 'pending_sent' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#120609] text-stone-400 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    Requested
                  </span>
                ) : u.friendshipStatus === 'pending_received' ? (
                  <Link
                    to="/social"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium"
                  >
                    Respond
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendFriendRequest(u.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add
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
