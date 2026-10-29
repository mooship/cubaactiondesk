CREATE TABLE `action_counts` (
	`slug` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `link_checks` (
	`url` text PRIMARY KEY NOT NULL,
	`last_status` integer,
	`consecutive_fail` integer DEFAULT 0 NOT NULL,
	`checked_at` text NOT NULL
);
