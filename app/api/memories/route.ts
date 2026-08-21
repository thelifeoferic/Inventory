import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryItems, inventoryMemories } from "@/db/schema";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return message.includes("no such table")
    ? "The inventory memory log is not ready yet. Apply the generated D1 migration and reload."
    : message;
}

export async function GET() {
  try {
    const db = getDb();
    const memories = await db
      .select({
        id: inventoryMemories.id,
        itemId: inventoryMemories.itemId,
        itemName: inventoryItems.name,
        space: inventoryMemories.space,
        note: inventoryMemories.note,
        createdBy: inventoryMemories.createdBy,
        createdAt: inventoryMemories.createdAt,
      })
      .from(inventoryMemories)
      .leftJoin(inventoryItems, eq(inventoryMemories.itemId, inventoryItems.id))
      .orderBy(desc(inventoryMemories.createdAt), desc(inventoryMemories.id));
    return Response.json({ memories });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { itemId?: number | null; space?: string; note?: string; createdBy?: string };
    const note = payload.note?.trim();
    const space = payload.space?.trim();
    if (!note || !space) return Response.json({ error: "Space and memory are required." }, { status: 400 });
    const db = getDb();
    const [memory] = await db.insert(inventoryMemories).values({
      itemId: payload.itemId || null,
      space,
      note,
      createdBy: payload.createdBy?.trim() || "Wren team",
    }).returning();
    return Response.json({ memory }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
