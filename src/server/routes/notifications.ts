import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { notifications, users } from '../../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();

// GET /api/notifications?page=1&limit=20&unreadOnly=false
notificationsRouter.get('/', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
  const offset = (page - 1) * limit;
  const unreadOnly = req.query.unreadOnly === 'true';

  const whereClause = unreadOnly
    ? and(
        eq(notifications.recipientId, myId),
        eq(notifications.isRead, false)
      )
    : eq(notifications.recipientId, myId);

  const totalRow = db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(whereClause)
    .get();
  const total = totalRow?.count ?? 0;

  const unreadCountRow = db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, myId),
        eq(notifications.isRead, false)
      )
    )
    .get();

  const rows = db
    .select({
      id: notifications.id,
      recipientId: notifications.recipientId,
      type: notifications.type,
      referenceId: notifications.referenceId,
      tmdbId: notifications.tmdbId,
      message: notifications.message,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      actor: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(notifications)
    .innerJoin(users, eq(notifications.actorId, users.id))
    .where(whereClause)
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit)
    .offset(offset)
    .all();

  res.json({
    notifications: rows,
    unreadCount: unreadCountRow?.count ?? 0,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', requireAuth, (req, res) => {
  const myId = req.user!.id;
  const notificationId = Number.parseInt(String(req.params.id), 10);

  const updated = db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientId, myId)
      )
    )
    .returning()
    .get();

  if (!updated) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  res.json({ notification: updated });
});

// POST /api/notifications/read-all
notificationsRouter.post('/read-all', requireAuth, (req, res) => {
  const myId = req.user!.id;

  db.update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.recipientId, myId))
    .run();

  res.json({ success: true });
});
