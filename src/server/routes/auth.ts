import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, sessions, notifications } from '../../db/schema.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
} from '../middleware/auth.js';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', (req, res) => {
  try {
    const { username, password, displayName, bio, avatarUrl } = req.body ?? {};

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      res.status(400).json({
        error:
          'Username must be 3-24 characters and contain only lowercase letters, numbers, or underscores',
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const existing = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, cleanUsername))
      .get();

    if (existing) {
      res.status(409).json({ error: 'Username is already taken' });
      return;
    }

    const passwordHash = hashPassword(password);
    const inserted = db
      .insert(users)
      .values({
        username: cleanUsername,
        passwordHash,
        displayName: displayName?.trim() || cleanUsername,
        bio: bio?.trim() || null,
        avatarUrl: avatarUrl?.trim() || null,
      })
      .returning({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .get();

    const session = createSession(inserted.id);
    setSessionCookie(res, session.id, session.expiresAt);

    res.status(201).json({
      user: inserted,
      unreadNotificationsCount: 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to register user' });
  }
});

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const user = db
      .select()
      .from(users)
      .where(eq(users.username, cleanUsername))
      .get();

    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const session = createSession(user.id);
    setSessionCookie(res, session.id, session.expiresAt);

    const unreadCountRow = db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, user.id),
          eq(notifications.isRead, false)
        )
      )
      .get();

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      unreadNotificationsCount: unreadCountRow?.count ?? 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to log in' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', requireAuth, (req, res) => {
  if (req.sessionId) {
    db.delete(sessions).where(eq(sessions.id, req.sessionId)).run();
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req, res) => {
  const unreadCountRow = db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, req.user!.id),
        eq(notifications.isRead, false)
      )
    )
    .get();

  res.json({
    user: req.user,
    unreadNotificationsCount: unreadCountRow?.count ?? 0,
  });
});

// PATCH /api/auth/me
authRouter.patch('/me', requireAuth, (req, res) => {
  const { displayName, bio, avatarUrl } = req.body ?? {};

  const updated = db
    .update(users)
    .set({
      displayName:
        displayName !== undefined ? (displayName?.trim() || null) : req.user!.displayName,
      bio: bio !== undefined ? (bio?.trim() || null) : req.user!.bio,
      avatarUrl:
        avatarUrl !== undefined ? (avatarUrl?.trim() || null) : req.user!.avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, req.user!.id))
    .returning({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .get();

  res.json({ user: updated });
});
