import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ============================================================================
// 1. USERS & SESSIONS (Authentication)
// ============================================================================

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex('users_username_idx').on(table.username)]
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)]
);

// ============================================================================
// 2. FRIENDSHIPS (Social & Privacy Gatekeeper)
// ============================================================================

export const friendships = sqliteTable(
  'friendships',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    requesterId: integer('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: integer('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'accepted', 'declined'] })
      .notNull()
      .default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('friendships_pair_unique_idx').on(
      table.requesterId,
      table.addresseeId
    ),
    index('friendships_requester_status_idx').on(
      table.requesterId,
      table.status
    ),
    index('friendships_addressee_status_idx').on(
      table.addresseeId,
      table.status
    ),
    check('no_self_friendship', sql`${table.requesterId} != ${table.addresseeId}`),
  ]
);

// ============================================================================
// 3. PERSONAL LISTS (Watched List & Watchlist)
// ============================================================================

export const watchedMovies = sqliteTable(
  'watched_movies',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tmdbId: integer('tmdb_id').notNull(),
    watchedAt: integer('watched_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    rewatchCount: integer('rewatch_count').notNull().default(0),
    liked: integer('liked', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('watched_movies_user_tmdb_unique_idx').on(
      table.userId,
      table.tmdbId
    ),
    index('watched_movies_user_watched_at_idx').on(
      table.userId,
      table.watchedAt
    ),
  ]
);

export const watchlistItems = sqliteTable(
  'watchlist_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tmdbId: integer('tmdb_id').notNull(),
    notes: text('notes'),
    addedAt: integer('added_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('watchlist_items_user_tmdb_unique_idx').on(
      table.userId,
      table.tmdbId
    ),
    index('watchlist_items_user_added_at_idx').on(table.userId, table.addedAt),
  ]
);

// ============================================================================
// 4. REVIEWS & RATINGS (Public)
// ============================================================================

export const reviews = sqliteTable(
  'reviews',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tmdbId: integer('tmdb_id').notNull(),
    ratingHalfStars: integer('rating_half_stars'),
    content: text('content'),
    containsSpoilers: integer('contains_spoilers', { mode: 'boolean' })
      .notNull()
      .default(false),
    watchedAt: integer('watched_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('reviews_user_created_idx').on(table.userId, table.createdAt),
    index('reviews_tmdb_created_idx').on(table.tmdbId, table.createdAt),
    check(
      'rating_half_stars_range',
      sql`${table.ratingHalfStars} IS NULL OR (${table.ratingHalfStars} >= 0 AND ${table.ratingHalfStars} <= 10)`
    ),
  ]
);

// ============================================================================
// 5. SHARED WATCHLISTS & MEMBERS (Multi-Friend Collaborative Watchlists)
// ============================================================================
// Users can create named Shared Watchlists and add/invite as many friends
// as they want. Any member can leave (exit) the shared watchlist at any time.

export const sharedWatchlists = sqliteTable(
  'shared_watchlists',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    createdById: integer('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('shared_watchlists_creator_idx').on(table.createdById)]
);

export const sharedWatchlistMembers = sqliteTable(
  'shared_watchlist_members',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sharedWatchlistId: integer('shared_watchlist_id')
      .notNull()
      .references(() => sharedWatchlists.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'member'] })
      .notNull()
      .default('member'),
    status: text('status', { enum: ['invited', 'joined'] })
      .notNull()
      .default('joined'),
    invitedById: integer('invited_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    joinedAt: integer('joined_at', { mode: 'timestamp' }),
  },
  (table) => [
    uniqueIndex('shared_watchlist_members_unique_idx').on(
      table.sharedWatchlistId,
      table.userId
    ),
    index('shared_watchlist_members_user_status_idx').on(
      table.userId,
      table.status
    ),
  ]
);

export const sharedWatchlistItems = sqliteTable(
  'shared_watchlist_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sharedWatchlistId: integer('shared_watchlist_id')
      .notNull()
      .references(() => sharedWatchlists.id, { onDelete: 'cascade' }),
    tmdbId: integer('tmdb_id').notNull(),
    addedById: integer('added_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    notes: text('notes'),
    isWatched: integer('is_watched', { mode: 'boolean' })
      .notNull()
      .default(false),
    watchedAt: integer('watched_at', { mode: 'timestamp' }),
    addedAt: integer('added_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('shared_watchlist_items_unique_idx').on(
      table.sharedWatchlistId,
      table.tmdbId
    ),
    index('shared_watchlist_items_list_added_idx').on(
      table.sharedWatchlistId,
      table.addedAt
    ),
  ]
);

// ============================================================================
// 6. NOTIFICATIONS
// ============================================================================

export const notifications = sqliteTable(
  'notifications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    recipientId: integer('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorId: integer('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', {
      enum: [
        'friend_request',
        'friend_accepted',
        'shared_watchlist_invite',
        'shared_watchlist_add',
        'friend_review',
      ],
    }).notNull(),
    referenceId: integer('reference_id'),
    tmdbId: integer('tmdb_id'),
    message: text('message'),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('notifications_recipient_read_created_idx').on(
      table.recipientId,
      table.isRead,
      table.createdAt
    ),
  ]
);

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  sentFriendRequests: many(friendships, { relationName: 'requester' }),
  receivedFriendRequests: many(friendships, { relationName: 'addressee' }),
  sharedWatchlistMemberships: many(sharedWatchlistMembers, {
    relationName: 'member',
  }),
  watchedMovies: many(watchedMovies),
  watchlistItems: many(watchlistItems),
  reviews: many(reviews),
  notificationsReceived: many(notifications, { relationName: 'recipient' }),
  notificationsTriggered: many(notifications, { relationName: 'actor' }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, {
    fields: [friendships.requesterId],
    references: [users.id],
    relationName: 'requester',
  }),
  addressee: one(users, {
    fields: [friendships.addresseeId],
    references: [users.id],
    relationName: 'addressee',
  }),
}));

export const watchedMoviesRelations = relations(watchedMovies, ({ one }) => ({
  user: one(users, {
    fields: [watchedMovies.userId],
    references: [users.id],
  }),
}));

export const watchlistItemsRelations = relations(watchlistItems, ({ one }) => ({
  user: one(users, {
    fields: [watchlistItems.userId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const sharedWatchlistsRelations = relations(
  sharedWatchlists,
  ({ one, many }) => ({
    createdBy: one(users, {
      fields: [sharedWatchlists.createdById],
      references: [users.id],
    }),
    members: many(sharedWatchlistMembers),
    items: many(sharedWatchlistItems),
  })
);

export const sharedWatchlistMembersRelations = relations(
  sharedWatchlistMembers,
  ({ one }) => ({
    sharedWatchlist: one(sharedWatchlists, {
      fields: [sharedWatchlistMembers.sharedWatchlistId],
      references: [sharedWatchlists.id],
    }),
    user: one(users, {
      fields: [sharedWatchlistMembers.userId],
      references: [users.id],
      relationName: 'member',
    }),
    invitedBy: one(users, {
      fields: [sharedWatchlistMembers.invitedById],
      references: [users.id],
    }),
  })
);

export const sharedWatchlistItemsRelations = relations(
  sharedWatchlistItems,
  ({ one }) => ({
    sharedWatchlist: one(sharedWatchlists, {
      fields: [sharedWatchlistItems.sharedWatchlistId],
      references: [sharedWatchlists.id],
    }),
    addedBy: one(users, {
      fields: [sharedWatchlistItems.addedById],
      references: [users.id],
    }),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: 'recipient',
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: 'actor',
  }),
}));
