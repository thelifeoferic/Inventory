import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const inventoryItems = sqliteTable(
  "inventory_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    space: text("space").notNull(),
    zone: text("zone").notNull(),
    quantity: integer("quantity").notNull().default(0),
    par: integer("par").notNull().default(0),
    unit: text("unit").notNull().default("each"),
    status: text("status").notNull().default("Count needed"),
    reorderUrl: text("reorder_url").notNull().default(""),
    notes: text("notes").notNull().default(""),
    photo: text("photo").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("inventory_items_name_idx").on(table.name),
    index("inventory_items_space_idx").on(table.space),
  ]
);

export const inventoryMemories = sqliteTable(
  "inventory_memories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id").references(() => inventoryItems.id, {
      onDelete: "set null",
    }),
    space: text("space").notNull(),
    note: text("note").notNull(),
    createdBy: text("created_by").notNull().default("Wren team"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("inventory_memories_item_idx").on(table.itemId)]
);

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InventoryMemory = typeof inventoryMemories.$inferSelect;
