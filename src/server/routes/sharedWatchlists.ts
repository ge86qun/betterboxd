import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  sharedWatchlists,
  sharedWatchlistMembers,
  sharedWatchlistItems,
  users,
  notifications,
} from '../../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import {
  canAccessSharedWatchlist,
  getFriendshipStatus,
  getSharedWatchlistMembership,
} from '../utils/permissions.js';
import {
  hydrateTmdbMoviesBatch,
  getTmdbMovieDetail,
} from '../services/tmdb.js';

export const sharedWatchlistsRouter = Router();

// GET /api/shared-watchlists
sharedWatchlistsRouter.get('/', requireAuth, (req, res) => {
  const myId = req.user!.id;

  const myMemberships = db
    .select({
      membershipId: sharedWatchlistMembers.id,
      role: sharedWatchlistMembers.role,
      status: sharedWatchlistMembers.status,
      joinedAt: sharedWatchlistMembers.joinedAt,
      watchlist: {
        id: sharedWatchlists.id,
        name: sharedWatchlists.name,
        description: sharedWatchlists.description,
        createdById: sharedWatchlists.createdById,
        createdAt: sharedWatchlists.createdAt,
        updatedAt: sharedWatchlists.updatedAt,
      },
    })
    .from(sharedWatchlistMembers)
    .innerJoin(
      sharedWatchlists,
      eq(sharedWatchlistMembers.sharedWatchlistId, sharedWatchlists.id)
    )
    .where(eq(sharedWatchlistMembers.userId, myId))
    .orderBy(desc(sharedWatchlists.updatedAt))
    .all();

  const joinedLists: any[] = [];
  const invitedLists: any[] = [];

  for (const m of myMemberships) {
    const members = db
      .select({
        userId: sharedWatchlistMembers.userId,
        role: sharedWatchlistMembers.role,
        status: sharedWatchlistMembers.status,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(sharedWatchlistMembers)
      .innerJoin(users, eq(sharedWatchlistMembers.userId, users.id))
      .where(
        and(
          eq(sharedWatchlistMembers.sharedWatchlistId, m.watchlist.id),
          eq(sharedWatchlistMembers.status, 'joined')
        )
      )
      .all();

    const itemCountRow = db
      .select({ count: sql<number>`count(*)` })
      .from(sharedWatchlistItems)
      .where(eq(sharedWatchlistItems.sharedWatchlistId, m.watchlist.id))
      .get();

    const otherMembers = members.filter((mem) => mem.userId !== myId);
    const contextLabel =
      otherMembers.length === 0
        ? 'Only you'
        : otherMembers.length <= 2
        ? `With ${otherMembers.map((o) => `@${o.username}`).join(', ')}`
        : `With @${otherMembers[0].username} +${otherMembers.length - 1} more`;

    const enriched = {
      ...m.watchlist,
      myRole: m.role,
      myStatus: m.status,
      itemCount: itemCountRow?.count ?? 0,
      members,
      contextLabel,
    };

    if (m.status === 'joined') {
      joinedLists.push(enriched);
    } else {
      invitedLists.push(enriched);
    }
  }

  res.json({
    sharedWatchlists: joinedLists,
    invites: invitedLists,
  });
});

// POST /api/shared-watchlists
// Create a named shared watchlist and add as many accepted friends as desired
sharedWatchlistsRouter.post('/', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const { name, description, memberIds } = req.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Watchlist name is required' });
    return;
  }

  const created = db
    .insert(sharedWatchlists)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      createdById: myId,
    })
    .returning()
    .get();

  // Add creator as owner
  db.insert(sharedWatchlistMembers)
    .values({
      sharedWatchlistId: created.id,
      userId: myId,
      role: 'owner',
      status: 'joined',
      joinedAt: new Date(),
    })
    .run();

  // Add selected accepted friends directly to the shared watchlist
  if (Array.isArray(memberIds)) {
    const uniqueFriendIds = Array.from(
      new Set(memberIds.map((id: any) => Number(id)))
    );

    for (const friendId of uniqueFriendIds) {
      if (
        Number.isInteger(friendId) &&
        friendId > 0 &&
        friendId !== myId &&
        getFriendshipStatus(myId, friendId).status === 'friends'
      ) {
        db.insert(sharedWatchlistMembers)
          .values({
            sharedWatchlistId: created.id,
            userId: friendId,
            role: 'member',
            status: 'joined',
            invitedById: myId,
            joinedAt: new Date(),
          })
          .onConflictDoNothing()
          .run();

        db.insert(notifications)
          .values({
            recipientId: friendId,
            actorId: myId,
            type: 'shared_watchlist_invite',
            referenceId: created.id,
            message: `${
              req.user!.displayName || req.user!.username
            } added you to the shared watchlist "${created.name}".`,
          })
          .run();
      }
    }
  }

  res.status(201).json({ sharedWatchlist: created });
});

// GET /api/shared-watchlists/:id?page=1&limit=24
sharedWatchlistsRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const myId = req.user!.id;
    const listId = Number.parseInt(String(req.params.id), 10);

    const access = canAccessSharedWatchlist(myId, listId);
    if (!access.allowed || !access.watchlist) {
      res
        .status(403)
        .json({ error: 'You do not have access to this shared watchlist' });
      return;
    }

    const members = db
      .select({
        userId: sharedWatchlistMembers.userId,
        role: sharedWatchlistMembers.role,
        status: sharedWatchlistMembers.status,
        joinedAt: sharedWatchlistMembers.joinedAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(sharedWatchlistMembers)
      .innerJoin(users, eq(sharedWatchlistMembers.userId, users.id))
      .where(
        and(
          eq(sharedWatchlistMembers.sharedWatchlistId, listId),
          eq(sharedWatchlistMembers.status, 'joined')
        )
      )
      .all();

    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page || '1'), 10) || 1
    );
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(String(req.query.limit || '24'), 10) || 24)
    );
    const offset = (page - 1) * limit;

    const totalRow = db
      .select({ count: sql<number>`count(*)` })
      .from(sharedWatchlistItems)
      .where(eq(sharedWatchlistItems.sharedWatchlistId, listId))
      .get();
    const total = totalRow?.count ?? 0;

    const rows = db
      .select({
        id: sharedWatchlistItems.id,
        sharedWatchlistId: sharedWatchlistItems.sharedWatchlistId,
        tmdbId: sharedWatchlistItems.tmdbId,
        notes: sharedWatchlistItems.notes,
        isWatched: sharedWatchlistItems.isWatched,
        watchedAt: sharedWatchlistItems.watchedAt,
        addedAt: sharedWatchlistItems.addedAt,
        addedBy: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(sharedWatchlistItems)
      .innerJoin(users, eq(sharedWatchlistItems.addedById, users.id))
      .where(eq(sharedWatchlistItems.sharedWatchlistId, listId))
      .orderBy(desc(sharedWatchlistItems.addedAt), desc(sharedWatchlistItems.id))
      .limit(limit)
      .offset(offset)
      .all();

    const moviesMap = await hydrateTmdbMoviesBatch(rows.map((r) => r.tmdbId));

    res.json({
      sharedWatchlist: access.watchlist,
      myMembership: access.membership,
      members,
      items: rows.map((r) => ({
        ...r,
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
    res
      .status(500)
      .json({ error: err.message || 'Failed to fetch shared watchlist' });
  }
});

// POST /api/shared-watchlists/:id/members
// Add one or more friends to an existing shared watchlist
sharedWatchlistsRouter.post('/:id/members', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const listId = Number.parseInt(String(req.params.id), 10);

  const access = canAccessSharedWatchlist(myId, listId);
  if (!access.allowed || !access.watchlist) {
    res
      .status(403)
      .json({ error: 'You must be a member of this shared watchlist to add friends' });
    return;
  }

  const rawIds = Array.isArray(req.body?.userIds)
    ? req.body.userIds
    : req.body?.userId
    ? [req.body.userId]
    : [];

  const addedUserIds: number[] = [];

  for (const rawId of rawIds) {
    const friendId = Number(rawId);
    if (
      !Number.isInteger(friendId) ||
      friendId <= 0 ||
      friendId === myId ||
      getFriendshipStatus(myId, friendId).status !== 'friends'
    ) {
      continue;
    }

    const existing = getSharedWatchlistMembership(friendId, listId);
    if (existing) continue;

    db.insert(sharedWatchlistMembers)
      .values({
        sharedWatchlistId: listId,
        userId: friendId,
        role: 'member',
        status: 'joined',
        invitedById: myId,
        joinedAt: new Date(),
      })
      .run();

    db.insert(notifications)
      .values({
        recipientId: friendId,
        actorId: myId,
        type: 'shared_watchlist_invite',
        referenceId: listId,
        message: `${
          req.user!.displayName || req.user!.username
        } added you to the shared watchlist "${access.watchlist.name}".`,
      })
      .run();

    addedUserIds.push(friendId);
  }

  res.status(201).json({ addedUserIds });
});

// DELETE /api/shared-watchlists/:id/members/:userId (or /leave)
// Allows a user to exit (leave) a shared watchlist, or an owner to remove a member
sharedWatchlistsRouter.delete(
  '/:id/members/:userId',
  requireAuth,
  (req, res) => {
    const myId = req.user!.id;
    const listId = Number.parseInt(String(req.params.id), 10);
    const targetUserId =
      req.params.userId === 'me'
        ? myId
        : Number.parseInt(String(req.params.userId), 10);

    const myMembership = getSharedWatchlistMembership(myId, listId);
    if (!myMembership) {
      res.status(403).json({ error: 'You are not in this shared watchlist' });
      return;
    }

    const isSelf = myId === targetUserId;
    const isOwner = myMembership.role === 'owner';

    if (!isSelf && !isOwner) {
      res.status(403).json({
        error: 'Only the watchlist owner can remove other members',
      });
      return;
    }

    db.delete(sharedWatchlistMembers)
      .where(
        and(
          eq(sharedWatchlistMembers.sharedWatchlistId, listId),
          eq(sharedWatchlistMembers.userId, targetUserId)
        )
      )
      .run();

    // Check if any members remain; if none, clean up the watchlist
    const remaining = db
      .select()
      .from(sharedWatchlistMembers)
      .where(eq(sharedWatchlistMembers.sharedWatchlistId, listId))
      .all();

    if (remaining.length === 0) {
      db.delete(sharedWatchlists)
        .where(eq(sharedWatchlists.id, listId))
        .run();
    } else if (isSelf && isOwner) {
      // Promote the earliest remaining member to owner so the watchlist stays manageable
      db.update(sharedWatchlistMembers)
        .set({ role: 'owner' })
        .where(eq(sharedWatchlistMembers.id, remaining[0].id))
        .run();
    }

    res.json({ success: true });
  }
);

// POST /api/shared-watchlists/:id/items
sharedWatchlistsRouter.post('/:id/items', requireAuth, async (req, res) => {
  try {
    const myId = req.user!.id;
    const listId = Number.parseInt(String(req.params.id), 10);
    const { tmdbId, notes } = req.body ?? {};
    const numericTmdbId = Number(tmdbId);

    if (!Number.isInteger(numericTmdbId) || numericTmdbId <= 0) {
      res.status(400).json({ error: 'Valid tmdbId is required' });
      return;
    }

    const access = canAccessSharedWatchlist(myId, listId);
    if (!access.allowed || !access.watchlist) {
      res
        .status(403)
        .json({ error: 'You do not have access to this shared watchlist' });
      return;
    }

    const existing = db
      .select()
      .from(sharedWatchlistItems)
      .where(
        and(
          eq(sharedWatchlistItems.sharedWatchlistId, listId),
          eq(sharedWatchlistItems.tmdbId, numericTmdbId)
        )
      )
      .get();

    if (existing) {
      res
        .status(409)
        .json({ error: 'Movie is already in this shared watchlist' });
      return;
    }

    const inserted = db
      .insert(sharedWatchlistItems)
      .values({
        sharedWatchlistId: listId,
        tmdbId: numericTmdbId,
        addedById: myId,
        notes: notes?.trim() || null,
      })
      .returning()
      .get();

    db.update(sharedWatchlists)
      .set({ updatedAt: new Date() })
      .where(eq(sharedWatchlists.id, listId))
      .run();

    // Notify all other members in the shared watchlist
    if (access.recipientIds.length > 0) {
      const movieDetail = await getTmdbMovieDetail(numericTmdbId);
      const message = `${
        req.user!.displayName || req.user!.username
      } added "${movieDetail.title}" to "${access.watchlist.name}".`;

      for (const recipientId of access.recipientIds) {
        db.insert(notifications)
          .values({
            recipientId,
            actorId: myId,
            type: 'shared_watchlist_add',
            referenceId: listId,
            tmdbId: numericTmdbId,
            message,
          })
          .run();
      }
    }

    res.status(201).json({ item: inserted });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to add movie to shared watchlist',
    });
  }
});

// PATCH /api/shared-watchlists/:id/items/:tmdbId
sharedWatchlistsRouter.patch('/:id/items/:tmdbId', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const listId = Number.parseInt(String(req.params.id), 10);
  const tmdbId = Number.parseInt(String(req.params.tmdbId), 10);

  const access = canAccessSharedWatchlist(myId, listId);
  if (!access.allowed) {
    res
      .status(403)
      .json({ error: 'You do not have access to this shared watchlist' });
    return;
  }

  const existing = db
    .select()
    .from(sharedWatchlistItems)
    .where(
      and(
        eq(sharedWatchlistItems.sharedWatchlistId, listId),
        eq(sharedWatchlistItems.tmdbId, tmdbId)
      )
    )
    .get();

  if (!existing) {
    res.status(404).json({ error: 'Item not found in shared watchlist' });
    return;
  }

  const { isWatched, notes } = req.body ?? {};
  const nextIsWatched =
    typeof isWatched === 'boolean' ? isWatched : existing.isWatched;

  const updated = db
    .update(sharedWatchlistItems)
    .set({
      isWatched: nextIsWatched,
      watchedAt: nextIsWatched ? existing.watchedAt || new Date() : null,
      notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
    })
    .where(eq(sharedWatchlistItems.id, existing.id))
    .returning()
    .get();

  res.json({ item: updated });
});

// DELETE /api/shared-watchlists/:id/items/:tmdbId
sharedWatchlistsRouter.delete('/:id/items/:tmdbId', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const listId = Number.parseInt(String(req.params.id), 10);
  const tmdbId = Number.parseInt(String(req.params.tmdbId), 10);

  const access = canAccessSharedWatchlist(myId, listId);
  if (!access.allowed) {
    res
      .status(403)
      .json({ error: 'You do not have access to this shared watchlist' });
    return;
  }

  db.delete(sharedWatchlistItems)
    .where(
      and(
        eq(sharedWatchlistItems.sharedWatchlistId, listId),
        eq(sharedWatchlistItems.tmdbId, tmdbId)
      )
    )
    .run();

  res.json({ success: true });
});
