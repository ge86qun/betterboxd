import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Heart } from 'lucide-react';
import type { MovieSummary } from '../lib/api.js';
import { StarRating } from './StarRating.js';

interface MovieCardProps {
  movie: MovieSummary | null | undefined;
  tmdbId: number;
  rating?: number | null;
  liked?: boolean;
  badgeText?: string | null;
  subtitle?: string | null;
}

export function MovieCard({
  movie,
  tmdbId,
  rating,
  liked,
  badgeText,
  subtitle,
}: MovieCardProps) {
  const title = movie?.title || `Movie #${tmdbId}`;
  const year = movie?.releaseYear;
  const posterUrl = movie?.posterUrl;

  return (
    <Link
      to={`/movie/${tmdbId}`}
      className="group flex flex-col focus:outline-none"
    >
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#1a0c10] border border-rose-950/70 shadow-md group-hover:border-rose-500/70 group-hover:shadow-rose-600/15 transition-all duration-200">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#261017] to-[#16080c]">
            <Film className="w-8 h-8 text-rose-900 mb-2" />
            <span className="text-xs font-medium text-stone-300 line-clamp-3">
              {title}
            </span>
          </div>
        )}

        {/* Top-right TMDB or custom badge */}
        {badgeText ? (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#120609]/85 backdrop-blur-md border border-rose-800/60 text-[10px] font-semibold text-amber-300">
            {badgeText}
          </div>
        ) : movie?.voteAverage ? (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[#120609]/80 backdrop-blur-sm border border-rose-950 text-[10px] font-semibold text-stone-200">
            ★ {movie.voteAverage.toFixed(1)}
          </div>
        ) : null}

        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#120609]/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Title & metadata */}
      <div className="mt-2 px-0.5">
        <h3 className="text-xs sm:text-sm font-medium text-stone-100 group-hover:text-rose-400 transition-colors line-clamp-1">
          {title}
        </h3>
        <div className="mt-0.5 flex items-center justify-between gap-1 text-[11px] text-stone-400">
          <span className="truncate">{subtitle || year || '—'}</span>
          <div className="flex items-center gap-1 shrink-0">
            {rating !== null && rating !== undefined && (
              <StarRating value={rating} readOnly size="sm" />
            )}
            {liked && (
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
