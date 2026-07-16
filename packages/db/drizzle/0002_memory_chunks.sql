CREATE TABLE `memory_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`start_message_id` text NOT NULL,
	`end_message_id` text NOT NULL,
	`source_text` text NOT NULL,
	`summary` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_code` text,
	`profile` text,
	`embedding` text,
	`dimension` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memory_chunks_conversation_idx` ON `memory_chunks` (`conversation_id`);
--> statement-breakpoint
CREATE INDEX `memory_chunks_range_idx` ON `memory_chunks` (`conversation_id`,`start_message_id`,`end_message_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `memory_chunks_conversation_range_unique` ON `memory_chunks` (`conversation_id`,`start_message_id`,`end_message_id`);
