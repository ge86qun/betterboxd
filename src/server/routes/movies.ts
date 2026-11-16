import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  watchedMovies,
  watchlistItems,
  reviews,
  users,
} from '../../db/schema.js';
import {
  searchTmdbMovies,
  getTrendingTmdbMovies,
  getTmdbMovieDetail,
  hydrateTmdbMoviesBatch,
} from '../services/tmdb.js';
import { fromHalfStars } from '../utils/permissions.js';

export const moviesRouter = Router();

// GET /api/movies/search?q=&page=
moviesRouter.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);

    if (!q) {
      res.json({ results: [], page: 1, totalPages: 0, totalResults: 0 });
      return;
    }

    const data = await searchTmdbMovies(q, page);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to search TMDB' });
  }
});

// GET /api/movies/trending?window=week&page=1
moviesRouter.get('/trending', async (req, res) => {
  try {
    const window = req.query.window === 'day' ? 'day' : 'week';
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);

    const data = await getTrendingTmdbMovies(window, page);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch trending movies' });
  }
});

// POST /api/movies/batch
moviesRouter.post('/batch', async (req, res) => {
  try {
    const tmdbIds = Array.isArray(req.body?.tmdbIds)
      ? req.body.tmdbIds.map((id: any) => Number(id)).slice(0, 60)
      : [];

    const movies = await hydrateTmdbMoviesBatch(tmdbIds);
    res.json({ movies });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to batch hydrate movies' });
  }
});

// GET /api/movies/:tmdbId
moviesRouter.get('/:tmdbId', async (req, res) => {
  try {
    const tmdbId = Number.parseInt(req.params.tmdbId, 10);
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      res.status(400).json({ error: 'Invalid TMDB movie ID' });
      return;
    }

    const movie = await getTmdbMovieDetail(tmdbId);

    // Community rating stats from Betterboxd public reviews
    const statsRow = db
      .select({
        reviewCount: sql<number>`count(*)`,
        ratedCount: sql<number>`count(${reviews.ratingHalfStars})`,
        avgHalfStars: sql<number | null>`avg(${reviews.ratingHalfStars})`,
      })
      .from(reviews)
      .where(eq(reviews.tmdbId, tmdbId))
      .get();

    const watchedCountRow = db
      .select({ count: sql<number>`count(*)` })
      .from(watchedMovies)
      .where(eq(watchedMovies.tmdbId, tmdbId))
      .get();

    // Recent public reviews for this movie
    const recentReviewsRows = db
      .select({
        id: reviews.id,
        tmdbId: reviews.tmdbId,
        ratingHalfStars: reviews.ratingHalfStars,
        content: reviews.content,
        containsSpoilers: reviews.containsSpoilers,
        watchedAt: reviews.watchedAt,
        createdAt: reviews.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.tmdbId, tmdbId))
      .orderBy(desc(reviews.createdAt))
      .limit(20)
      .all();

    const recentReviews = recentReviewsRows.map((r) => ({
      ...r,
      rating: fromHalfStars(r.ratingHalfStars),
    }));

    // Viewer's personal state for this movie (if logged in)
    let viewerState: {
      watched: boolean;
      liked: boolean;
      rewatchCount: number;
      watchedAt: Date | null;
      inWatchlist: boolean;
      myReview: any | null;
    } | null = null;

    if (req.user) {
      const watchedRecord = db
        .select()
        .from(watchedMovies)
        .where(
          and(
            eq(watchedMovies.userId, req.user.id),
            eq(watchedMovies.tmdbId, tmdbId)
          )
        )
        .get();

      const watchlistRecord = db
        .select()
        .from(watchlistItems)
        .where(
          and(
            eq(watchlistItems.userId, req.user.id),
            eq(watchlistItems.tmdbId, tmdbId)
          )
        )
        .get();

      const myReviewRecord = db
        .select()
        .from(reviews)
        .where(
          and(eq(reviews.userId, req.user.id), eq(reviews.tmdbId, tmdbId))
        )
        .orderBy(desc(reviews.createdAt))
        .get();

      viewerState = {
        watched: Boolean(watchedRecord),
        liked: watchedRecord?.liked ?? false,
        rewatchCount: watchedRecord?.rewatchCount ?? 0,
        watchedAt: watchedRecord?.watchedAt ?? null,
        inWatchlist: Boolean(watchlistRecord),
        myReview: myReviewRecord
          ? {
              ...myReviewRecord,
              rating: fromHalfStars(myReviewRecord.ratingHalfStars),
            }
          : null,
      };
    }

    const avgRating =
      statsRow?.avgHalfStars !== null && statsRow?.avgHalfStars !== undefined
        ? Math.round((statsRow.avgHalfStars / 2) * 100) / 100
        : null;

    res.json({
      movie,
      communityStats: {
        reviewCount: statsRow?.reviewCount ?? 0,
        ratedCount: statsRow?.ratedCount ?? 0,
        averageRating: avgRating,
        watchedCount: watchedCountRow?.count ?? 0,
      },
      viewerState,
      reviews: recentReviews,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch movie details' });
  }
});
