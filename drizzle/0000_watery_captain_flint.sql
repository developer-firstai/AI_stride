CREATE TABLE `admins` (
	`slot` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`last_sync` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`profile` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `steps` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`steps` integer NOT NULL,
	`source` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `date`),
	FOREIGN KEY (`user_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_steps_date_user` ON `steps` (`date`,`user_id`);