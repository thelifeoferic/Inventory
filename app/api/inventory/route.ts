import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryItems } from "@/db/schema";
import { locations, roomMinibarSeedItems, seedItems } from "@/lib/inventory-data";
import { housekeepingSeedItems } from "@/lib/housekeeping-data";
import { guestRoomSeedItems } from "@/lib/guest-room-data";
import { propertySeedItems } from "@/lib/property-data";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) {
    return "The inventory database is not ready yet. Apply the generated D1 migration and reload.";
  }
  return message;
}

async function seedIfEmpty() {
  const db = getDb();
  const completeSeed = [...seedItems, ...housekeepingSeedItems, ...guestRoomSeedItems, ...propertySeedItems];
  const insertInChunks = async (records: typeof completeSeed) => {
    for (let index = 0; index < records.length; index += 20) {
      await db.insert(inventoryItems).values(records.slice(index, index + 20).map((item) => ({ reorderUrl: "", ...item })));
    }
  };
  const existing = await db.select({ id: inventoryItems.id }).from(inventoryItems).limit(1);
  if (!existing.length) {
    await insertInChunks(completeSeed);
  } else {
    const roomItems = await db.select({ name: inventoryItems.name, space: inventoryItems.space, zone: inventoryItems.zone })
      .from(inventoryItems);
    const existingKeys = new Set(roomItems.map((item) => `${item.space}|${item.zone}|${item.name}`));
    const managedItems = [...roomMinibarSeedItems, ...housekeepingSeedItems, ...guestRoomSeedItems, ...propertySeedItems];
    const missingManagedItems = managedItems.filter((item) => !existingKeys.has(`${item.space}|${item.zone}|${item.name}`));
    if (missingManagedItems.length) await insertInChunks(missingManagedItems);
  }
  return db;
}

export async function GET() {
  try {
    const db = await seedIfEmpty();
    const items = await db.select().from(inventoryItems).orderBy(asc(inventoryItems.space), asc(inventoryItems.name));
    return Response.json({ items, locations });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Partial<typeof inventoryItems.$inferInsert>;
    const name = payload.name?.trim();
    const space = payload.space?.trim();
    const zone = payload.zone?.trim();
    if (!name || !space || !zone) {
      return Response.json({ error: "Name, space and map zone are required." }, { status: 400 });
    }
    const db = getDb();
    const [item] = await db.insert(inventoryItems).values({
      name,
      space,
      zone,
      quantity: Number(payload.quantity ?? 0),
      par: Number(payload.par ?? 0),
      unit: payload.unit?.trim() || "each",
      status: payload.status?.trim() || "Count needed",
      reorderUrl: payload.reorderUrl?.trim() || "",
      notes: payload.notes?.trim() || "",
      photo: payload.photo?.trim() || "",
    }).returning();
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as Partial<typeof inventoryItems.$inferInsert> & { id?: number };
    if (!payload.id) return Response.json({ error: "Item id is required." }, { status: 400 });
    const changes: Partial<typeof inventoryItems.$inferInsert> = {
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.space !== undefined ? { space: payload.space.trim() } : {}),
      ...(payload.zone !== undefined ? { zone: payload.zone.trim() } : {}),
      ...(payload.quantity !== undefined ? { quantity: Number(payload.quantity) } : {}),
      ...(payload.par !== undefined ? { par: Number(payload.par) } : {}),
      ...(payload.unit !== undefined ? { unit: payload.unit.trim() || "each" } : {}),
      ...(payload.status !== undefined ? { status: payload.status.trim() } : {}),
      ...(payload.reorderUrl !== undefined ? { reorderUrl: payload.reorderUrl.trim() } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes.trim() } : {}),
      ...(payload.photo !== undefined ? { photo: payload.photo.trim() } : {}),
      updatedAt: new Date().toISOString(),
    };
    const db = getDb();
    const [item] = await db.update(inventoryItems).set(changes).where(eq(inventoryItems.id, payload.id)).returning();
    return Response.json({ item });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
