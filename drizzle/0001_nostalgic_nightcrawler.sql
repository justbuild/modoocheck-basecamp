CREATE TABLE `delegated_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`family_secret_ciphertext` text NOT NULL,
	`family_secret_iv` text NOT NULL,
	`family_secret_tag` text NOT NULL,
	`access_token_ciphertext` text,
	`access_token_iv` text,
	`access_token_tag` text,
	`access_expires_at` integer,
	`scopes_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `official_requests` (
	`request_id` text PRIMARY KEY NOT NULL,
	`operation` text NOT NULL,
	`kind` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text NOT NULL,
	`result_json` text,
	`next_action` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `official_snapshots` (
	`key` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`data_json` text NOT NULL,
	`fetched_at` integer NOT NULL
);
