import { Router } from 'express';
import { eq, or, and, like, ne, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  users,
  friendships,
  watchedMovies,
  watchlistItems,
  reviews,
  notifications,
} from '../../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getFriendshipStatus,
  canViewPrivateLists,
  fromHalfStars,
} from '../utils/permissions.js';
import { hydrateTmdbMoviesBatch } from '../services/tmdb.js';

export const usersRouter = Router();
export const friendsRouter = Router();

// GET /api/users/search?q=&page=1&limit=20
usersRouter.get('/search', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
  const offset = (page - 1) * limit;

  const whereClause = q
    ? and(
        ne(users.id, req.user!.id),
        or(
          like(users.username, `%${q}%`),
          like(users.displayName, `%${q}%`)
        )
      )
    : ne(users.id, req.user!.id);

  const matchedUsers = db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .all();

  const results = matchedUsers.map((u) => {
    const rel = getFriendshipStatus(req.user!.id, u.id);
    return {
      ...u,
      friendshipStatus: rel.status,
      friendshipId: rel.friendshipId,
    };
  });

  res.json({ results, page, limit });
});

// GET /api/users/:username
usersRouter.get('/:username', (req, res) => {
  const cleanUsername = String(req.params.username).trim().toLowerCase();
  const targetUser = db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, cleanUsername))
    .get();

  if (!targetUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const rel = getFriendshipStatus(req.user?.id, targetUser.id);
  const canViewLists = canViewPrivateLists(req.user?.id, targetUser.id);

  // Reviews are always public
  const reviewCountRow = db
    .select({ count: sql<number>`count(*)` })
    .from(reviews)
    .where(eq(reviews.userId, targetUser.id))
    .get();

  const friendsCountRow = db
    .select({ count: sql<number>`count(*)` })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          eq(friendships.requesterId, targetUser.id),
          eq(friendships.addresseeId, targetUser.id)
        )
      )
    )
    .get();

  let watchedCount: number | null = null;
  let watchlistCount: number | null = null;

  if (canViewLists) {
    const watchedRow = db
      .select({ count: sql<number>`count(*)` })
      .from(watchedMovies)
      .where(eq(watchedMovies.userId, targetUser.id))
      .get();
    const watchlistRow = db
      .select({ count: sql<number>`count(*)` })
      .from(watchlistItems)
      .where(eq(watchlistItems.userId, targetUser.id))
      .get();

    watchedCount = watchedRow?.count ?? 0;
    watchlistCount = watchlistRow?.count ?? 0;
  }

  res.json({
    user: targetUser,
    relationship: {
      status: rel.status,
      friendshipId: rel.friendshipId,
      canViewPrivateLists: canViewLists,
    },
    stats: {
      reviewCount: reviewCountRow?.count ?? 0,
      friendsCount: friendsCountRow?.count ?? 0,
      watchedCount,
      watchlistCount,
    },
  });
});

// GET /api/users/:username/watched?page=1&limit=24
usersRouter.get('/:username/watched', requireAuth, async (req, res) => {
  try {
    const cleanUsername = String(req.params.username).trim().toLowerCase();
    const targetUser = db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.username, cleanUsername))
      .get();

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!canViewPrivateLists(req.user!.id, targetUser.id)) {
      res.status(403).json({
        error: 'Watched lists are private and only visible to accepted friends.',
      });
      return;
    }

    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '24'), 10) || 24));
    const offset = (page - 1) * limit;

    const totalRow = db
      .select({ count: sql<number>`count(*)` })
      .from(watchedMovies)
      .where(eq(watchedMovies.userId, targetUser.id))
      .get();
    const total = totalRow?.count ?? 0;

    const items = db
      .select()
      .from(watchedMovies)
      .where(eq(watchedMovies.userId, targetUser.id))
      .orderBy(desc(watchedMovies.watchedAt), desc(watchedMovies.id))
      .limit(limit)
      .offset(offset)
      .all();

    // Also attach the user's latest rating for each watched movie if present
    const userReviews = db
      .select({
        tmdbId: reviews.tmdbId,
        ratingHalfStars: reviews.ratingHalfStars,
      })
      .from(reviews)
      .where(eq(reviews.userId, targetUser.id))
      .all();

    const ratingMap = new Map<number, number | null>();
    for (const r of userReviews) {
      if (!ratingMap.has(r.tmdbId) && r.ratingHalfStars !== null) {
        ratingMap.set(r.tmdbId, fromHalfStars(r.ratingHalfStars));
      }
    }

    const moviesMap = await hydrateTmdbMoviesBatch(items.map((i) => i.tmdbId));

    res.json({
      items: items.map((item) => ({
        ...item,
        rating: ratingMap.get(item.tmdbId) ?? null,
        movie: moviesMap[item.tmdbId] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch watched list' });
  }
});

// GET /api/users/:username/watchlist?page=1&limit=24
usersRouter.get('/:username/watchlist', requireAuth, async (req, res) => {
  try {
    const cleanUsername = String(req.params.username).trim().toLowerCase();
    const targetUser = db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.username, cleanUsername))
      .get();

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!canViewPrivateLists(req.user!.id, targetUser.id)) {
      res.status(403).json({
        error: 'Watchlists are private and only visible to accepted friends.',
      });
      return;
    }

    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '24'), 10) || 24));
    const offset = (page - 1) * limit;

    const totalRow = db
      .select({ count: sql<number>`count(*)` })
      .from(watchlistItems)
      .where(eq(watchlistItems.userId, targetUser.id))
      .get();
    const total = totalRow?.count ?? 0;

    const items = db
      .select()
      .from(watchlistItems)
      .where(eq(watchlistItems.userId, targetUser.id))
      .orderBy(desc(watchlistItems.addedAt), desc(watchlistItems.id))
      .limit(limit)
      .offset(offset)
      .all();

    const moviesMap = await hydrateTmdbMoviesBatch(items.map((i) => i.tmdbId));

    res.json({
      items: items.map((item) => ({
        ...item,
        movie: moviesMap[item.tmdbId] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch watchlist' });
  }
});

// ============================================================================
// FRIENDSHIP ENDPOINTS (/api/friends)
// ============================================================================

// GET /api/friends
friendsRouter.get('/', requireAuth, (req, res) => {
  const myId = req.user!.id;

  const allRows = db
    .select()
    .from(friendships)
    .where(
      or(
        eq(friendships.requesterId, myId),
        eq(friendships.addresseeId, myId)
      )
    )
    .orderBy(desc(friendships.updatedAt))
    .all();

  const userIds = new Set<number>();
  for (const r of allRows) {
    userIds.add(r.requesterId === myId ? r.addresseeId : r.requesterId);
  }

  const userMap = new Map<number, any>();
  for (const uid of userIds) {
    const u = db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, uid))
      .get();
    if (u) userMap.set(uid, u);
  }

  const friends: any[] = [];
  const incomingRequests: any[] = [];
  const outgoingRequests: any[] = [];

  for (const r of allRows) {
    const otherId = r.requesterId === myId ? r.addresseeId : r.requesterId;
    const otherUser = userMap.get(otherId);
    if (!otherUser) continue;

    if (r.status === 'accepted') {
      friends.push({
        friendshipId: r.id,
        user: otherUser,
        since: r.updatedAt,
      });
    } else if (r.status === 'pending') {
      if (r.addresseeId === myId) {
        incomingRequests.push({
          friendshipId: r.id,
          user: otherUser,
          createdAt: r.createdAt,
        });
      } else {
        outgoingRequests.push({
          friendshipId: r.id,
          user: otherUser,
          createdAt: r.createdAt,
        });
      }
    }
  }

  res.json({
    friends,
    incomingRequests,
    outgoingRequests,
  });
});

// POST /api/friends/request/:userId
friendsRouter.post('/request/:userId', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const targetUserId = Number.parseInt(String(req.params.userId), 10);

  if (!Number.isInteger(targetUserId) || targetUserId <= 0 || targetUserId === myId) {
    res.status(400).json({ error: 'Invalid target user ID' });
    return;
  }

  const targetUser = db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.id, targetUserId))
    .get();

  if (!targetUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const existing = db
    .select()
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, myId),
          eq(friendships.addresseeId, targetUserId)
        ),
        and(
          eq(friendships.requesterId, targetUserId),
          eq(friendships.addresseeId, myId)
        )
      )
    )
    .get();

  if (existing) {
    if (existing.status === 'accepted') {
      res.status(409).json({ error: 'You are already friends with this user' });
      return;
    }
    if (existing.status === 'pending') {
      res.status(409).json({ error: 'A friend request is already pending' });
      return;
    }
    // If previously declined, reopen as pending from current requester
    const reopened = db
      .update(friendships)
      .set({
        requesterId: myId,
        addresseeId: targetUserId,
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(friendships.id, existing.id))
      .returning()
      .get();

    db.insert(notifications)
      .values({
        recipientId: targetUserId,
        actorId: myId,
        type: 'friend_request',
        referenceId: reopened.id,
        message: `${req.user!.displayName || req.user!.username} sent you a friend request.`,
      })
      .run();

    res.status(201).json({ friendship: reopened });
    return;
  }

  const created = db
    .insert(friendships)
    .values({
      requesterId: myId,
      addresseeId: targetUserId,
      status: 'pending',
    })
    .returning()
    .get();

  db.insert(notifications)
    .values({
      recipientId: targetUserId,
      actorId: myId,
      type: 'friend_request',
      referenceId: created.id,
      message: `${req.user!.displayName || req.user!.username} sent you a friend request.`,
    })
    .run();

  res.status(201).json({ friendship: created });
});

// POST /api/friends/respond/:friendshipId
friendsRouter.post('/respond/:friendshipId', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const friendshipId = Number.parseInt(String(req.params.friendshipId), 10);
  const { action } = req.body ?? {};

  if (action !== 'accept' && action !== 'decline') {
    res.status(400).json({ error: "Action must be 'accept' or 'decline'" });
    return;
  }

  const record = db
    .select()
    .from(friendships)
    .where(eq(friendships.id, friendshipId))
    .get();

  if (!record || record.addresseeId !== myId || record.status !== 'pending') {
    res.status(404).json({ error: 'Pending friend request not found' });
    return;
  }

  const newStatus = action === 'accept' ? 'accepted' : 'declined';
  const updated = db
    .update(friendships)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(friendships.id, friendshipId))
    .returning()
    .get();

  if (action === 'accept') {
    db.insert(notifications)
      .values({
        recipientId: record.requesterId,
        actorId: myId,
        type: 'friend_accepted',
        referenceId: updated.id,
        message: `${req.user!.displayName || req.user!.username} accepted your friend request.`,
      })
      .run();
  }

  res.json({ friendship: updated });
});

// DELETE /api/friends/:friendshipId
friendsRouter.delete('/:friendshipId', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const friendshipId = Number.parseInt(String(req.params.friendshipId), 10);

  const record = db
    .select()
    .from(friendships)
    .where(eq(friendships.id, friendshipId))
    .get();

  if (
    !record ||
    (record.requesterId !== myId && record.addresseeId !== myId)
  ) {
    res.status(404).json({ error: 'Friendship not found' });
    return;
  }

  db.delete(friendships).where(eq(friendships.id, friendshipId)).run();
  res.json({ success: true });
});
