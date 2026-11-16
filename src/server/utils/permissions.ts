import { and, eq, or } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  friendships,
  sharedWatchlists,
  sharedWatchlistMembers,
} from '../../db/schema.js';

export type FriendshipStatus =
  | 'self'
  | 'friends'
  | 'pending_sent'
  | 'pending_received'
  | 'none';

export interface FriendshipCheck {
  status: FriendshipStatus;
  friendshipId: number | null;
}

/**
 * Determines the relationship between `viewerId` and `targetUserId`.
 */
export function getFriendshipStatus(
  viewerId: number | undefined,
  targetUserId: number
): FriendshipCheck {
  if (!viewerId) {
    return { status: 'none', friendshipId: null };
  }
  if (viewerId === targetUserId) {
    return { status: 'self', friendshipId: null };
  }

  const record = db
    .select()
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, viewerId),
          eq(friendships.addresseeId, targetUserId)
        ),
        and(
          eq(friendships.requesterId, targetUserId),
          eq(friendships.addresseeId, viewerId)
        )
      )
    )
    .get();

  if (!record || record.status === 'declined') {
    return { status: 'none', friendshipId: record?.id ?? null };
  }

  if (record.status === 'accepted') {
    return { status: 'friends', friendshipId: record.id };
  }

  if (record.requesterId === viewerId) {
    return { status: 'pending_sent', friendshipId: record.id };
  }

  return { status: 'pending_received', friendshipId: record.id };
}

/**
 * Privacy Rule: Personal Watched Lists and Watchlists are private to accepted friends only (or self).
 */
export function canViewPrivateLists(
  viewerId: number | undefined,
  targetUserId: number
): boolean {
  const { status } = getFriendshipStatus(viewerId, targetUserId);
  return status === 'self' || status === 'friends';
}

/**
 * Returns all accepted friend user IDs for a given user.
 */
export function getAcceptedFriendIds(userId: number): number[] {
  const rows = db
    .select({
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId)
        )
      )
    )
    .all();

  return rows.map((r) =>
    r.requesterId === userId ? r.addresseeId : r.requesterId
  );
}

/**
 * Checks if `userId` is a member of `sharedWatchlistId`.
 */
export function getSharedWatchlistMembership(
  userId: number,
  sharedWatchlistId: number
) {
  return db
    .select()
    .from(sharedWatchlistMembers)
    .where(
      and(
        eq(sharedWatchlistMembers.sharedWatchlistId, sharedWatchlistId),
        eq(sharedWatchlistMembers.userId, userId)
      )
    )
    .get();
}

/**
 * Checks if `userId` has access to a shared watchlist (must be a joined member).
 */
export function canAccessSharedWatchlist(
  userId: number,
  sharedWatchlistId: number
): {
  allowed: boolean;
  watchlist?: typeof sharedWatchlists.$inferSelect;
  membership?: typeof sharedWatchlistMembers.$inferSelect;
  recipientIds: number[];
} {
  const watchlist = db
    .select()
    .from(sharedWatchlists)
    .where(eq(sharedWatchlists.id, sharedWatchlistId))
    .get();

  if (!watchlist) {
    return { allowed: false, recipientIds: [] };
  }

  const members = db
    .select()
    .from(sharedWatchlistMembers)
    .where(
      and(
        eq(sharedWatchlistMembers.sharedWatchlistId, sharedWatchlistId),
        eq(sharedWatchlistMembers.status, 'joined')
      )
    )
    .all();

  const myMembership = members.find((m) => m.userId === userId);
  if (!myMembership) {
    return { allowed: false, recipientIds: [] };
  }

  const otherMemberIds = members
    .map((m) => m.userId)
    .filter((id) => id !== userId);

  return {
    allowed: true,
    watchlist,
    membership: myMembership,
    recipientIds: otherMemberIds,
  };
}

/**
 * Converts a user-facing rating (0 to 5 in 0.5 increments) into `rating_half_stars` (0 to 10 integer).
 */
export function toHalfStars(rating: number | null | undefined): number | null {
  if (rating === null || rating === undefined) return null;
  if (typeof rating !== 'number' || Number.isNaN(rating)) {
    throw new Error('Rating must be a valid number');
  }
  const doubled = rating * 2;
  if (!Number.isInteger(doubled) || doubled < 0 || doubled > 10) {
    throw new Error('Rating must be between 0 and 5.0 in 0.5 increments');
  }
  return doubled;
}

/**
 * Converts `rating_half_stars` (0..10 integer) back to a decimal rating (0.0..5.0).
 */
export function fromHalfStars(
  halfStars: number | null | undefined
): number | null {
  if (halfStars === null || halfStars === undefined) return null;
  return halfStars / 2;
}
