CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`space` text NOT NULL,
	`zone` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`par` integer DEFAULT 0 NOT NULL,
	`unit` text DEFAULT 'each' NOT NULL,
	`status` text DEFAULT 'Count needed' NOT NULL,
	`reorder_url` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`photo` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inventory_items_name_idx` ON `inventory_items` (`name`);--> statement-breakpoint
CREATE INDEX `inventory_items_space_idx` ON `inventory_items` (`space`);--> statement-breakpoint
CREATE TABLE `inventory_memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer,
	`space` text NOT NULL,
	`note` text NOT NULL,
	`created_by` text DEFAULT 'Wren team' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `inventory_memories_item_idx` ON `inventory_memories` (`item_id`);