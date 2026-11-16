export interface User {
  id: number;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface MovieSummary {
  tmdbId: number;
  title: string;
  overview: string;
  releaseDate: string | null;
  releaseYear: number | null;
  posterPath: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  backdropUrl: string | null;
  voteAverage: number;
}

export interface MovieDetail extends MovieSummary {
  tagline: string | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
  directors: { id: number; name: string; profileUrl: string | null }[];
  cast: {
    id: number;
    name: string;
    character: string;
    profileUrl: string | null;
  }[];
}

export interface ReviewItem {
  id: number;
  userId: number;
  tmdbId: number;
  rating: number | null;
  ratingHalfStars: number | null;
  content: string | null;
  containsSpoilers: boolean;
  watchedAt: string | null;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  movie?: MovieSummary | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// In production on the Raspberry Pi, points to http://192.168.178.201:3000/api
// (or relative /api when served directly by the Express server on port 3000)
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname === '192.168.178.201'
    ? 'http://192.168.178.201:3000/api'
    : '/api');

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}
