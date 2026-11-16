import { Router } from 'express';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  reviews,
  users,
  watchedMovies,
  watchlistItems,
  notifications,
} from '../../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import {
  toHalfStars,
  fromHalfStars,
  getAcceptedFriendIds,
} from '../utils/permissions.js';
import { hydrateTmdbMoviesBatch, getTmdbMovieDetail } from '../services/tmdb.js';

export const reviewsRouter = Router();

// GET /api/reviews?userId=&username=&tmdbId=&page=1&limit=20
reviewsRouter.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
    const offset = (page - 1) * limit;

    let filterUserId: number | undefined = req.query.userId
      ? Number.parseInt(String(req.query.userId), 10)
      : undefined;

    if (!filterUserId && req.query.username) {
      const u = db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, String(req.query.username).trim().toLowerCase()))
        .get();
      if (!u) {
        res.json({
          reviews: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
        return;
      }
      filterUserId = u.id;
    }

    const filterTmdbId = req.query.tmdbId
      ? Number.parseInt(String(req.query.tmdbId), 10)
      : undefined;

    const conditions = [];
    if (filterUserId) conditions.push(eq(reviews.userId, filterUserId));
    if (filterTmdbId) conditions.push(eq(reviews.tmdbId, filterTmdbId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRow = db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(whereClause)
      .get();
    const total = totalRow?.count ?? 0;

    const rows = db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        tmdbId: reviews.tmdbId,
        ratingHalfStars: reviews.ratingHalfStars,
        content: reviews.content,
        containsSpoilers: reviews.containsSpoilers,
        watchedAt: reviews.watchedAt,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(whereClause)
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .limit(limit)
      .offset(offset)
      .all();

    const moviesMap = await hydrateTmdbMoviesBatch(rows.map((r) => r.tmdbId));

    res.json({
      reviews: rows.map((r) => ({
        ...r,
        rating: fromHalfStars(r.ratingHalfStars),
        movie: moviesMap[r.tmdbId] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/feed?page=1&limit=20
reviewsRouter.get('/feed', requireAuth, async (req, res) => {
  try {
    const myId = req.user!.id;
    const friendIds = getAcceptedFriendIds(myId);
    const feedUserIds = [myId, ...friendIds];

    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
    const offset = (page - 1) * limit;

    const totalRow = db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(inArray(reviews.userId, feedUserIds))
      .get();
    const total = totalRow?.count ?? 0;

    const rows = db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        tmdbId: reviews.tmdbId,
        ratingHalfStars: reviews.ratingHalfStars,
        content: reviews.content,
        containsSpoilers: reviews.containsSpoilers,
        watchedAt: reviews.watchedAt,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(inArray(reviews.userId, feedUserIds))
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .limit(limit)
      .offset(offset)
      .all();

    const moviesMap = await hydrateTmdbMoviesBatch(rows.map((r) => r.tmdbId));

    res.json({
      reviews: rows.map((r) => ({
        ...r,
        rating: fromHalfStars(r.ratingHalfStars),
        movie: moviesMap[r.tmdbId] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch friends review feed' });
  }
});

// POST /api/reviews
reviewsRouter.post('/', requireAuth, async (req, res) => {
  try {
    const myId = req.user!.id;
    const {
      tmdbId,
      rating,
      content,
      containsSpoilers,
      watchedAt,
      liked,
      markAsWatched = true,
    } = req.body ?? {};

    const numericTmdbId = Number(tmdbId);
    if (!Number.isInteger(numericTmdbId) || numericTmdbId <= 0) {
      res.status(400).json({ error: 'Valid tmdbId is required' });
      return;
    }

    let ratingHalfStars: number | null = null;
    try {
      ratingHalfStars = toHalfStars(rating);
    } catch (validationErr: any) {
      res.status(400).json({ error: validationErr.message });
      return;
    }

    const cleanContent = typeof content === 'string' ? content.trim() : '';
    if (ratingHalfStars === null && !cleanContent) {
      res.status(400).json({
        error: 'A review must include either a star rating (0-5) or text content',
      });
      return;
    }

    const watchedDate = watchedAt ? new Date(watchedAt) : new Date();

    const createdReview = db
      .insert(reviews)
      .values({
        userId: myId,
        tmdbId: numericTmdbId,
        ratingHalfStars,
        content: cleanContent || null,
        containsSpoilers: Boolean(containsSpoilers),
        watchedAt: watchedDate,
      })
      .returning()
      .get();

    // Automatically ensure the movie is on the user's Watched List and removed from Watchlist
    if (markAsWatched) {
      const existingWatched = db
        .select()
        .from(watchedMovies)
        .where(
          and(
            eq(watchedMovies.userId, myId),
            eq(watchedMovies.tmdbId, numericTmdbId)
          )
        )
        .get();

      if (!existingWatched) {
        db.insert(watchedMovies)
          .values({
            userId: myId,
            tmdbId: numericTmdbId,
            watchedAt: watchedDate,
            liked: Boolean(liked),
          })
          .run();
      } else if (typeof liked === 'boolean') {
        db.update(watchedMovies)
          .set({ liked })
          .where(eq(watchedMovies.id, existingWatched.id))
          .run();
      }

      db.delete(watchlistItems)
        .where(
          and(
            eq(watchlistItems.userId, myId),
            eq(watchlistItems.tmdbId, numericTmdbId)
          )
        )
        .run();
    }

    // Notify all accepted friends about the new review
    const friendIds = getAcceptedFriendIds(myId);
    if (friendIds.length > 0) {
      const movieDetail = await getTmdbMovieDetail(numericTmdbId);
      const starLabel =
        ratingHalfStars !== null ? ` (${ratingHalfStars / 2}★)` : '';
      const message = `${req.user!.displayName || req.user!.username} reviewed ${movieDetail.title}${starLabel}.`;

      for (const friendId of friendIds) {
        db.insert(notifications)
          .values({
            recipientId: friendId,
            actorId: myId,
            type: 'friend_review',
            referenceId: createdReview.id,
            tmdbId: numericTmdbId,
            message,
          })
          .run();
      }
    }

    res.status(201).json({
      review: {
        ...createdReview,
        rating: fromHalfStars(createdReview.ratingHalfStars),
        user: req.user,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create review' });
  }
});

// PATCH /api/reviews/:reviewId
reviewsRouter.patch('/:reviewId', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const reviewId = Number.parseInt(String(req.params.reviewId), 10);

  const existing = db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }

  if (existing.userId !== myId) {
    res.status(403).json({ error: 'You can only edit your own reviews' });
    return;
  }

  const { rating, content, containsSpoilers } = req.body ?? {};
  let ratingHalfStars = existing.ratingHalfStars;

  if (rating !== undefined) {
    try {
      ratingHalfStars = toHalfStars(rating);
    } catch (validationErr: any) {
      res.status(400).json({ error: validationErr.message });
      return;
    }
  }

  const updated = db
    .update(reviews)
    .set({
      ratingHalfStars,
      content:
        content !== undefined ? (content?.trim() || null) : existing.content,
      containsSpoilers:
        typeof containsSpoilers === 'boolean'
          ? containsSpoilers
          : existing.containsSpoilers,
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId))
    .returning()
    .get();

  res.json({
    review: {
      ...updated,
      rating: fromHalfStars(updated.ratingHalfStars),
    },
  });
});

// DELETE /api/reviews/:reviewId
reviewsRouter.delete('/:reviewId', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const reviewId = Number.parseInt(String(req.params.reviewId), 10);

  const existing = db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }

  if (existing.userId !== myId) {
    res.status(403).json({ error: 'You can only delete your own reviews' });
    return;
  }

  db.delete(reviews).where(eq(reviews.id, reviewId)).run();
  res.json({ success: true });
});
