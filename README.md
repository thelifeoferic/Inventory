# Hotel Wren Inventory

A standalone mapped inventory and operational memory tool for Hotel Wren. It is intentionally separate from The Nest so the inventory workflow can be tested before integration.

## Included

- Search by item, space, zone or note
- Clickable inventory maps for Conex, Windsong, Pool Room, Laundry Room, Lobby, Wren House and Rooms 01–12
- Conex visual audit gallery using 23 source photographs
- Seeded Conex inventory with confirmed, photo-estimated and count-needed labels
- Quantity, par level, unit, exact map zone and optional reorder URL
- Item-specific and space-wide operational memory log
- Durable D1 persistence for items and history
- Responsive white-and-black interface

## Local development

```bash
npm install
npm run db:generate
npm run dev
```

The first generated migration is in `drizzle/0000_fixed_firebird.sql`. The application expects a Cloudflare D1 binding named `DB`, configured in `.openai/hosting.json`.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm test
```
