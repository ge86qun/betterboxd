CREATE TABLE `friendships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requester_id` integer NOT NULL,
	`addressee_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`addressee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "no_self_friendship" CHECK("friendships"."requester_id" != "friendships"."addressee_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friendships_pair_unique_idx` ON `friendships` (`requester_id`,`addressee_id`);--> statement-breakpoint
CREATE INDEX `friendships_requester_status_idx` ON `friendships` (`requester_id`,`status`);--> statement-breakpoint
CREATE INDEX `friendships_addressee_status_idx` ON `friendships` (`addressee_id`,`status`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipient_id` integer NOT NULL,
	`actor_id` integer NOT NULL,
	`type` text NOT NULL,
	`reference_id` integer,
	`tmdb_id` integer,
	`message` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_recipient_read_created_idx` ON `notifications` (`recipient_id`,`is_read`,`created_at`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`rating_half_stars` integer,
	`content` text,
	`contains_spoilers` integer DEFAULT false NOT NULL,
	`watched_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "rating_half_stars_range" CHECK("reviews"."rating_half_stars" IS NULL OR ("reviews"."rating_half_stars" >= 0 AND "reviews"."rating_half_stars" <= 10))
);
--> statement-breakpoint
CREATE INDEX `reviews_user_created_idx` ON `reviews` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `reviews_tmdb_created_idx` ON `reviews` (`tmdb_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `shared_watchlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shared_watchlist_id` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`added_by_id` integer NOT NULL,
	`notes` text,
	`is_watched` integer DEFAULT false NOT NULL,
	`watched_at` integer,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`shared_watchlist_id`) REFERENCES `shared_watchlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shared_watchlist_items_unique_idx` ON `shared_watchlist_items` (`shared_watchlist_id`,`tmdb_id`);--> statement-breakpoint
CREATE INDEX `shared_watchlist_items_list_added_idx` ON `shared_watchlist_items` (`shared_watchlist_id`,`added_at`);--> statement-breakpoint
CREATE TABLE `shared_watchlist_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shared_watchlist_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'joined' NOT NULL,
	`invited_by_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`joined_at` integer,
	FOREIGN KEY (`shared_watchlist_id`) REFERENCES `shared_watchlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shared_watchlist_members_unique_idx` ON `shared_watchlist_members` (`shared_watchlist_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `shared_watchlist_members_user_status_idx` ON `shared_watchlist_members` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `shared_watchlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_by_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shared_watchlists_creator_idx` ON `shared_watchlists` (`created_by_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text,
	`bio` text,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `watched_movies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`watched_at` integer DEFAULT (unixepoch()) NOT NULL,
	`rewatch_count` integer DEFAULT 0 NOT NULL,
	`liked` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watched_movies_user_tmdb_unique_idx` ON `watched_movies` (`user_id`,`tmdb_id`);--> statement-breakpoint
CREATE INDEX `watched_movies_user_watched_at_idx` ON `watched_movies` (`user_id`,`watched_at`);--> statement-breakpoint
CREATE TABLE `watchlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`notes` text,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_items_user_tmdb_unique_idx` ON `watchlist_items` (`user_id`,`tmdb_id`);--> statement-breakpoint
CREATE INDEX `watchlist_items_user_added_at_idx` ON `watchlist_items` (`user_id`,`added_at`);