CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "conversations_display_name_not_empty" CHECK(length(trim("conversations"."display_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "messages_role_domain" CHECK("messages"."role" in ('user', 'assistant')),
	CONSTRAINT "messages_content_not_empty" CHECK(length(trim("messages"."content")) > 0)
);
--> statement-breakpoint
CREATE INDEX `messages_conversation_created_idx` ON `messages` (`conversation_id`,`created_at`);