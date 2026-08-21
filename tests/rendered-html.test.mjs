import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("includes the full Hotel Wren mapped inventory experience", async () => {
  const [page, layout, data, migration, hosting] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("lib/inventory-data.ts", root), "utf8"),
    readFile(new URL("drizzle/0000_fixed_firebird.sql", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
  ]);

  assert.match(layout, /Hotel Wren Inventory/);
  assert.match(page, /Space maps/);
  assert.match(page, /All items/);
  assert.match(page, /Memory/);
  assert.match(page, /Reorder link/);
  assert.match(data, /Array\.from\(\{ length: 12 \}/);
  assert.match(data, /WREN HOUSE/);
  assert.match(data, /CONEX/);
  assert.match(data, /Parachute Hospitality Bath Towels/);
  assert.match(migration, /CREATE TABLE `inventory_items`/);
  assert.match(migration, /CREATE TABLE `inventory_memories`/);
  assert.equal(JSON.parse(hosting).d1, "DB");
  await access(new URL("public/conex/IMG_4306.jpg", root));
});
