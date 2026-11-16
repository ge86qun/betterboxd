import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { eq, gt, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { sessions, users } from '../../db/schema.js';

export const SESSION_COOKIE_NAME = 'betterboxd_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface AuthUser {
  id: number;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

export function createSession(userId: number): { id: string; expiresAt: Date } {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  db.insert(sessions)
    .values({
      id,
      userId,
      expiresAt,
    })
    .run();

  return { id, expiresAt };
}

export function setSessionCookie(res: Response, sessionId: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    expires: expiresAt,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  });
}

/**
 * Attaches `req.user` if a valid session cookie or Bearer token is present.
 */
export function attachAuth(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const sessionId = cookieToken || headerToken;

  if (!sessionId) {
    return next();
  }

  const now = new Date();
  const row = db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      user: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .get();

  if (row) {
    req.user = row.user;
    req.sessionId = row.sessionId;
  }

  return next();
}

/**
 * Requires an authenticated user on `req.user`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}
