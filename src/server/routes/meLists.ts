import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { watchedMovies, watchlistItems } from '../../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

export const meListsRouter = Router();

// POST /api/me/watched
meListsRouter.post('/watched', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const { tmdbId, watchedAt, liked, rewatchCount } = req.body ?? {};
  const numericTmdbId = Number(tmdbId);

  if (!Number.isInteger(numericTmdbId) || numericTmdbId <= 0) {
    res.status(400).json({ error: 'Valid tmdbId is required' });
    return;
  }

  const existing = db
    .select()
    .from(watchedMovies)
    .where(
      and(
        eq(watchedMovies.userId, myId),
        eq(watchedMovies.tmdbId, numericTmdbId)
      )
    )
    .get();

  // Remove from personal watchlist when marked as watched
  db.delete(watchlistItems)
    .where(
      and(
        eq(watchlistItems.userId, myId),
        eq(watchlistItems.tmdbId, numericTmdbId)
      )
    )
    .run();

  if (existing) {
    const updated = db
      .update(watchedMovies)
      .set({
        watchedAt: watchedAt ? new Date(watchedAt) : existing.watchedAt,
        liked: typeof liked === 'boolean' ? liked : existing.liked,
        rewatchCount:
          typeof rewatchCount === 'number'
            ? Math.max(0, rewatchCount)
            : existing.rewatchCount,
      })
      .where(eq(watchedMovies.id, existing.id))
      .returning()
      .get();

    res.json({ item: updated });
    return;
  }

  const inserted = db
    .insert(watchedMovies)
    .values({
      userId: myId,
      tmdbId: numericTmdbId,
      watchedAt: watchedAt ? new Date(watchedAt) : new Date(),
      liked: Boolean(liked),
      rewatchCount: typeof rewatchCount === 'number' ? Math.max(0, rewatchCount) : 0,
    })
    .returning()
    .get();

  res.status(201).json({ item: inserted });
});

// PATCH /api/me/watched/:tmdbId
meListsRouter.patch('/watched/:tmdbId', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const tmdbId = Number.parseInt(String(req.params.tmdbId), 10);
  const { watchedAt, liked, rewatchCount } = req.body ?? {};

  const existing = db
    .select()
    .from(watchedMovies)
    .where(
      and(eq(watchedMovies.userId, myId), eq(watchedMovies.tmdbId, tmdbId))
    )
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Movie is not in your watched list' });
    return;
  }

  const updated = db
    .update(watchedMovies)
    .set({
      watchedAt: watchedAt ? new Date(watchedAt) : existing.watchedAt,
      liked: typeof liked === 'boolean' ? liked : existing.liked,
      rewatchCount:
        typeof rewatchCount === 'number'
          ? Math.max(0, rewatchCount)
          : existing.rewatchCount,
    })
    .where(eq(watchedMovies.id, existing.id))
    .returning()
    .get();

  res.json({ item: updated });
});

// DELETE /api/me/watched/:tmdbId
meListsRouter.delete('/watched/:tmdbId', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const tmdbId = Number.parseInt(String(req.params.tmdbId), 10);

  db.delete(watchedMovies)
    .where(
      and(eq(watchedMovies.userId, myId), eq(watchedMovies.tmdbId, tmdbId))
    )
    .run();

  res.json({ success: true });
});

// POST /api/me/watchlist
meListsRouter.post('/watchlist', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const { tmdbId, notes } = req.body ?? {};
  const numericTmdbId = Number(tmdbId);

  if (!Number.isInteger(numericTmdbId) || numericTmdbId <= 0) {
    res.status(400).json({ error: 'Valid tmdbId is required' });
    return;
  }

  const existing = db
    .select()
    .from(watchlistItems)
    .where(
      and(
        eq(watchlistItems.userId, myId),
        eq(watchlistItems.tmdbId, numericTmdbId)
      )
    )
    .get();

  if (existing) {
    const updated = db
      .update(watchlistItems)
      .set({
        notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
      })
      .where(eq(watchlistItems.id, existing.id))
      .returning()
      .get();

    res.json({ item: updated });
    return;
  }

  const inserted = db
    .insert(watchlistItems)
    .values({
      userId: myId,
      tmdbId: numericTmdbId,
      notes: notes?.trim() || null,
    })
    .returning()
    .get();

  res.status(201).json({ item: inserted });
});

// DELETE /api/me/watchlist/:tmdbId
meListsRouter.delete('/watchlist/:tmdbId', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const tmdbId = Number.parseInt(String(req.params.tmdbId), 10);

  db.delete(watchlistItems)
    .where(
      and(eq(watchlistItems.userId, myId), eq(watchlistItems.tmdbId, tmdbId))
    )
    .run();

  res.json({ success: true });
});
