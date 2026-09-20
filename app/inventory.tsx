"use client";

/* eslint-disable @next/next/no-img-element */

import { windsongProductSeedItems } from "@/lib/windsong-products";
import ManagerInbox from "./manager-inbox";
import LowStockReport from "./low-stock-report";
import StockControls from "./stock-controls";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  conexPhotos,
  locations,
  seedItems,
} from "@/lib/inventory-data";
import { housekeepingSeedItems } from "@/lib/housekeeping-data";
import { guestRoomSeedItems } from "@/lib/guest-room-data";
import { propertySeedItems } from "@/lib/property-data";

type Item = {
  vendor?: string;
  unitCost?: number | null;
  id: number;
  name: string;
  space: string;
  zone: string;
  mapSection: string;
  quantity: number;
  par: number;
  unit: string;
  status: string;
  reorderUrl: string;
  notes: string;
  photo: string;
  createdAt: string;
  updatedAt: string;
};

type Memory = {
  id: number;
  itemId: number | null;
  itemName?: string | null;
  space: string;
  note: string;
  createdBy: string;
  createdAt: string;
};

type ItemDraft = Omit<Item, "id" | "createdAt" | "updatedAt">;




const inventoryStorageKey = "hotel-wren-inventory-v1";
const memoryStorageKey = "hotel-wren-inventory-memory-v1";

const productMedia = [
  {
    matches: /canyon coffee/i,
    photo: "https://cdn.shopify.com/s/files/1/1493/1120/files/Classic_6_Front.jpg?v=1757527597&width=1920",
    reorderUrl: "https://canyoncoffee.co/products/instant-coffee?variant=50781660250421",
  },
  {
    matches: /bellocq tea/i,
    photo: "https://www.bellocqtea.com/cdn/shop/files/Untitled_design_22_a21d47ce-d5f5-40b2-96cb-f8a5014dd176_1024x1024.png?v=1781808617",
    reorderUrl: "https://www.bellocqtea.com/collections/tea-sachets",
  },
  {
    matches: /mountain valley spring water(?! cases)/i,
    photo: "https://www.mountainvalleyspring.com/cdn/shop/products/Mountain_Valley_Spring_1_liter.jpg?v=1600706139",
    reorderUrl: "https://www.mountainvalleyspring.com/products/1-liter-spring",
  },
  {
    matches: /the original.*warehouse gooseneck light/i,
    photo: "https://cdn.barnlight.com/images/thumbnails/475/475/detailed/45/original-gooseneck-16in-975-galvanized-G22.jpg?t=1781761408",
    reorderUrl: "https://www.barnlight.com/lighting/wall-lights/gooseneck-lights/the-original-gooseneck-light/",
  },
] as const;

const conexShelfDefinitions = [
  { zone: "Room supplies shelf", className: "conex-shelf conex-shelf-front-right", levelLabels: ["Room back stock", "Room amenities", "Room replacements"] },
  { zone: "Linen shelf", className: "conex-shelf conex-shelf-mid-right", levelLabels: ["Top linen", "Folded linen", "Bulk linen"] },
  { zone: "Tools shelf", className: "conex-shelf conex-shelf-rear-left", levelLabels: ["Maintenance", "Tools", "Paint + parts"] },
  { zone: "Parts shelf", className: "conex-shelf conex-shelf-rear-back", levelLabels: ["Electrical", "Hardware", "Materials"] },
  { zone: "Lighting shelf", className: "conex-shelf conex-shelf-rear-right", levelLabels: ["Light fixtures", "Lighting", "Large parts"] },
] as const;

function normalizeConexZone(zone: string) {
  if (zone === "Rear stock shelf") return "Parts shelf";
  if (zone === "Floor stock / water") return "Floor stock";
  return zone;
}

function defaultConexMapSection(zone: string) {
  return conexShelfDefinitions.find((entry) => entry.zone === normalizeConexZone(zone))?.levelLabels[0] || "";
}

function inferConexMapSection(item: { name: string; zone: string; mapSection?: string }) {
  const zone = normalizeConexZone(item.zone);
  const definition = conexShelfDefinitions.find((entry) => entry.zone === zone);
  if (!definition) return "";
  if (item.mapSection && definition.levelLabels.some((label) => label === item.mapSection)) return item.mapSection;

  const name = item.name.toLowerCase();
  if (zone === "Room supplies shelf") {
    if (/replacement|spare|fixture/.test(name)) return "Room replacements";
    if (/towel|cup|glass|bowl|beverage|serving|decanter|compost/.test(name)) return "Room amenities";
    return "Room back stock";
  }
  if (zone === "Linen shelf") {
    if (/towel/.test(name)) return "Folded linen";
    if (/encasement|packaged|sheet|duvet|linen/.test(name)) return "Bulk linen";
    return "Top linen";
  }
  if (zone === "Tools shelf") {
    if (/paint|part/.test(name)) return "Paint + parts";
    if (/maintenance/.test(name)) return "Maintenance";
    return "Tools";
  }
  if (zone === "Parts shelf") {
    if (/electrical/.test(name)) return "Electrical";
    if (/hardware|small part/.test(name)) return "Hardware";
    return "Materials";
  }
  if (/large/.test(name)) return "Large parts";
  if (/lighting/.test(name) && !/fixture/.test(name)) return "Lighting";
  return "Light fixtures";
}

function normalizeItem(item: Item): Item {
  const relocatedWater = /^(Cascade Mountain|Mountain Valley Spring) Water Cases$/i.test(item.name);
  const originalSpace = relocatedWater ? "POOL ROOM" : item.space;
  const space = originalSpace === "LAUNDRY ROOM" ? "HOUSEKEEPING" : originalSpace === "POOL ROOM" ? "POOL ROOM / WINDSONG BACK STOCK" : originalSpace;
  const zone = relocatedWater ? "Water storage" : /^ROOM \d+$/.test(space) ? ({ Minibar: "Mini Bar", Furnishings: "Permanent Fixtures", Fixtures: "Permanent Fixtures", Linens: "Guest Amenities" }[item.zone] || item.zone) : normalizeConexZone(item.zone);
  const media = productMedia.find((entry) => entry.matches.test(item.name));
  return {
    ...item,
    space,
    zone: space === "WINDSONG" && ["Plumbing Fixtures", "Equipment", "Hardware", "Seating", "Art", "Accessories"].includes(zone) ? "Hardware, Fixtures & Furniture" : zone,
    mapSection: space === "CONEX" ? inferConexMapSection({ ...item, zone }) : "",
    photo: item.photo || "",
    reorderUrl: item.reorderUrl || media?.reorderUrl || "",
  };
}

function seededInventory(): Item[] {
  const timestamp = new Date().toISOString();
  const completeSeed = [
    ...seedItems,
    ...housekeepingSeedItems,
    ...guestRoomSeedItems,
    ...propertySeedItems,
    ...windsongProductSeedItems,
  ];

  return completeSeed.map((item, index) => normalizeItem({
      id: index + 1,
      reorderUrl: "",
      ...item,
      zone: normalizeConexZone(item.zone),
      mapSection: inferConexMapSection(item),
      createdAt: timestamp,
      updatedAt: timestamp,
    } as Item));
}

const emptyDraft = (space = "CONEX", zone = "Entry", mapSection = ""): ItemDraft => ({
  name: "",
  space,
  zone,
  mapSection,
  quantity: 0,
  par: 0,
  unit: "each",
  status: "Count needed",
  reorderUrl: "",
  notes: "",
  photo: "",
});

const groups = ["Shared spaces", "Guest rooms", "Residence"] as const;

function countLabel(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function formatDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusClass(status: string) {
  if (status === "Confirmed") return "status-confirmed";
  if (status === "Photo estimate") return "status-estimate";
  return "status-needed";
}

function ProgressiveLoadMore({ visibleCount, total, onLoadMore }: { visibleCount: number; total: number; onLoadMore: () => void }) {
  const sentinelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= total) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
    }, { rootMargin: "240px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, total, visibleCount]);

  if (visibleCount >= total) return null;
  return (
    <button className="load-more" type="button" ref={sentinelRef} onClick={onLoadMore}>
      Load more <span>{visibleCount} of {total}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function Inventory({ isAdmin, displayName }: { isAdmin: boolean; displayName: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"items" | "spaces" | "memory" | "stock">("spaces");
  const [search, setSearch] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("ALL SPACES");
  const [selectedSpace, setSelectedSpace] = useState("WINDSONG");
  const [activeZone, setActiveZone] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft());
  const [addOpen, setAddOpen] = useState(false);
  const [itemMemory, setItemMemory] = useState("");
  const [generalMemory, setGeneralMemory] = useState("");
  const [generalMemorySpace, setGeneralMemorySpace] = useState("WINDSONG");
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [mapInventory, setMapInventory] = useState<{ zone: string; mapSection: string } | null>(null);
  const [masterInventoryOpen, setMasterInventoryOpen] = useState(false);
  const [masterVisibleCount, setMasterVisibleCount] = useState(30);
  const [saving, setSaving] = useState(false);
  const revision = useRef(0);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch("/api/inventory");
      if (response.status === 401 || response.status === 403) { window.location.assign("/login"); return; }
      if (!response.ok) throw new Error("Inventory could not be loaded. Please refresh to retry.");
      const data = await response.json();
      revision.current = data.revision;
      setItems((data.items || seededInventory()).map(normalizeItem));
      setMemories((data.memories || []).map((memory: Memory) => ({ ...memory, space: memory.space === "LAUNDRY ROOM" ? "HOUSEKEEPING" : memory.space === "POOL ROOM" ? "POOL ROOM / WINDSONG BACK STOCK" : memory.space })));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Inventory could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadData(); }, []);

  async function persist(nextItems: Item[], nextMemories: Memory[]) {
    const response = await fetch("/api/inventory", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({items: nextItems, memories: nextMemories, revision: revision.current}) });
    if (response.status === 409) { await loadData(); throw new Error("Another teammate saved changes. The latest inventory is loaded; please reopen the item and try again."); }
    if (!response.ok) throw new Error("Changes were not saved. Please check your connection and sign-in, then retry.");
    const data = await response.json();
    revision.current = data.revision;
    setItems(nextItems); setMemories(nextMemories);
  }

  const currentLocation = locations.find((location) => location.name === selectedSpace) || locations[0];
  const currentItems = useMemo(
    () => items.filter((item) => item.space === selectedSpace),
    [items, selectedSpace]
  );
  const mapInventoryItems = useMemo(() => {
    if (!mapInventory) return [];
    return currentItems.filter((item) => item.zone === mapInventory.zone && (!mapInventory.mapSection || item.mapSection === mapInventory.mapSection));
  }, [currentItems, mapInventory]);

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSpace = spaceFilter === "ALL SPACES" || item.space === spaceFilter;
      const matchesSearch = !needle || [item.name, item.space, item.zone, item.mapSection, item.notes, item.unit]
        .some((value) => value.toLowerCase().includes(needle));
      return matchesSpace && matchesSearch;
    });
  }, [items, search, spaceFilter]);
  const lowStock = items.filter((item) => item.par > 0 && item.quantity < item.par).length;
  const countNeeded = items.filter((item) => item.status === "Count needed").length;

  function openItem(item: Item) {
    setSelectedItem(item);
    setDraft({
      vendor: item.vendor ?? "",
      unitCost: item.unitCost ?? null,
      name: item.name,
      space: item.space,
      zone: item.zone,
      mapSection: item.mapSection,
      quantity: item.quantity,
      par: item.par,
      unit: item.unit,
      status: item.status,
      reorderUrl: item.reorderUrl,
      notes: item.notes,
      photo: item.photo,
    });
  }

  function openNewItem(space = selectedSpace, zone = activeZone || currentLocation.zones[0], mapSection = "") {
    const normalizedZone = normalizeConexZone(zone);
    setDraft(emptyDraft(space, normalizedZone, mapSection || (space === "CONEX" ? defaultConexMapSection(normalizedZone) : "")));
    setAddOpen(true);
  }

  function changeDraft<Key extends keyof ItemDraft>(key: Key, value: ItemDraft[Key]) {
    if (key === "photo" && !isAdmin) return;
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function syncZoneForSpace(space: string) {
    const location = locations.find((entry) => entry.name === space);
    const zone = location?.zones[0] || "Entry";
    setDraft((current) => ({ ...current, space, zone, mapSection: space === "CONEX" ? defaultConexMapSection(zone) : "" }));
  }

  function syncMapSectionForZone(zone: string) {
    const normalizedZone = normalizeConexZone(zone);
    const definition = conexShelfDefinitions.find((entry) => entry.zone === normalizedZone);
    setDraft((current) => ({ ...current, zone: normalizedZone, mapSection: definition?.levelLabels[0] || "" }));
  }

  async function submitNewItem(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (!draft.name.trim() || !draft.space.trim() || !draft.zone.trim()) {
        throw new Error("Name, space and map zone are required.");
      }
      const timestamp = new Date().toISOString();
      const item: Item = {
        ...draft,
        name: draft.name.trim(),
        id: items.reduce((highest, current) => Math.max(highest, current.id), 0) + 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await persist([...items, item], memories);
      setAddOpen(false);
      setSelectedSpace(item.space);
      setActiveZone("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Item could not be added.");
    } finally {
      setSaving(false);
    }
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault();
    if (!selectedItem) return;
    setSaving(true);
    try {
      if (draft.unitCost != null && (!Number.isFinite(draft.unitCost) || draft.unitCost < 0)) throw new Error("Unit cost must be zero or greater.");
      const item: Item = { ...selectedItem, ...draft, updatedAt: new Date().toISOString() };
      await persist(items.map((currentItem) => currentItem.id === item.id ? item : currentItem), memories);
      setSelectedItem(item);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function addMemory(note: string, space: string, itemId: number | null) {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const itemName = items.find((item) => item.id === itemId)?.name || null;
      const memory: Memory = {
        id: memories.reduce((highest, current) => Math.max(highest, current.id), 0) + 1,
        itemId,
        itemName,
        space,
        note: note.trim(),
        createdBy: displayName,
        createdAt: new Date().toISOString(),
      };
      await persist(items, [memory, ...memories]);
      setItemMemory("");
      setGeneralMemory("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Memory could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function renderItemForm(mode: "add" | "edit") {
    const location = locations.find((entry) => entry.name === draft.space) || locations[0];
    return (
      <form className="item-form" onSubmit={mode === "add" ? submitNewItem : saveItem}>
        <div className="form-grid form-grid-wide">
          <Field label="Item name">
            <input required value={draft.name} onChange={(event) => changeDraft("name", event.target.value)} />
          </Field>
          <Field label="Space">
            <select value={draft.space} onChange={(event) => syncZoneForSpace(event.target.value)}>
              {locations.map((entry) => <option key={entry.name}>{entry.name}</option>)}
            </select>
          </Field>
          <Field label="Map zone">
            <select value={draft.zone} onChange={(event) => syncMapSectionForZone(event.target.value)}>
              {location.zones.map((zone) => <option key={zone}>{zone}</option>)}
            </select>
          </Field>
          {draft.space === "CONEX" && conexShelfDefinitions.some((entry) => entry.zone === draft.zone) && (
            <Field label="Shelf section">
              <select value={draft.mapSection} onChange={(event) => changeDraft("mapSection", event.target.value)}>
                {conexShelfDefinitions.find((entry) => entry.zone === draft.zone)?.levelLabels.map((label) => <option key={label}>{label}</option>)}
              </select>
            </Field>
          )}
          <Field label="Count status">
            <select value={draft.status} onChange={(event) => changeDraft("status", event.target.value)}>
              <option>Confirmed</option>
              <option>Photo estimate</option>
              <option>Count needed</option>
            </select>
          </Field>
          <Field label="Quantity">
            <input type="number" min="0" value={draft.quantity} onChange={(event) => changeDraft("quantity", Number(event.target.value))} />
          </Field>
          <Field label="Par level">
            <input type="number" min="0" value={draft.par} onChange={(event) => changeDraft("par", Number(event.target.value))} />
          </Field>
          <Field label="Unit cost ($ per inventory unit)">
            <input type="number" min="0" step="0.01" value={draft.unitCost ?? ""} placeholder="Not recorded" onChange={event => changeDraft("unitCost", event.target.value === "" ? null : Number(event.target.value))} />
          </Field>
          <Field label="Unit">
            <input value={draft.unit} onChange={(event) => changeDraft("unit", event.target.value)} placeholder="each, case, roll…" />
          </Field>
          <Field label="Preferred vendor">
            <input value={draft.vendor ?? ""} onChange={event => changeDraft("vendor", event.target.value)} placeholder="Where we order this item" />
          </Field>
          <Field label="Reorder link (optional)">
            <input type="url" value={draft.reorderUrl} onChange={(event) => changeDraft("reorderUrl", event.target.value)} placeholder="https://…" />
          </Field>
          {isAdmin && <Field label="Product image URL">
            <input value={draft.photo} onChange={(event) => changeDraft("photo", event.target.value)} placeholder="/products/item.png or https://…" />
          </Field>}
        </div>
        <Field label="Notes">
          <textarea rows={4} value={draft.notes} onChange={(event) => changeDraft("notes", event.target.value)} placeholder="Size, model, packaging, preferred vendor, or count detail" />
        </Field>
        <div className="form-actions">
          <button className="button button-dark" disabled={saving} type="submit">{saving ? "Saving…" : mode === "add" ? "Add item" : "Save changes"}</button>
        </div>
      </form>
    );
  }

  return (
    <main>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => { setView("spaces"); setSelectedSpace("WINDSONG"); }}>
          <img src="/hotel-wren-logotype-brown.png" alt="Hotel Wren" />
          <span>Inventory</span>
        </button>
        <nav className="topnav" aria-label="Inventory views">
          <button className={view === "spaces" ? "active" : ""} onClick={() => setView("spaces")}>Spaces</button>
          <button className={view === "items" ? "active" : ""} onClick={() => setView("items")}>All items</button>
          <button className={view === "memory" ? "active" : ""} onClick={() => setView("memory")}>Memory</button>
          <button className={view === "stock" ? "active" : ""} onClick={() => setView("stock")}>Stock & purchasing{lowStock ? ` (${lowStock})` : ""}</button>
        </nav>
        <button className="button button-dark" type="button" onClick={() => openNewItem()} disabled={loading}>Add item</button>
      </header>

      <section className="account-bar"><span>{displayName} · {isAdmin ? "Admin" : "Staff"}</span><button className="button" onClick={() => { setView("items"); setMasterInventoryOpen(true); }}>Notify manager — choose an item</button><form action="/api/logout" method="post"><button className="text-button">Sign out</button></form></section>
      {isAdmin && <ManagerInbox />}
      <section className="searchbar" aria-label="Inventory search">
        <label className="search-field">
          <span className="sr-only">Search inventory</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); setMasterVisibleCount(30); if (event.target.value) { setView("items"); setMasterInventoryOpen(true); } }} placeholder="Search item, room, zone, or note" />
        </label>
        <select aria-label="Filter by space" value={spaceFilter} onChange={(event) => { setSpaceFilter(event.target.value); setMasterVisibleCount(30); }}>
          <option value="ALL SPACES">All</option>
          {locations.map((location) => <option key={location.name}>{location.name}</option>)}
        </select>
        <span className="search-result">{visibleItems.length} results</span>
      </section>

      {error && (
        <section className="error-banner" role="alert">
          <div><strong>Inventory needs attention.</strong><span>{error}</span></div>
          <button type="button" onClick={() => void loadData()}>Try again</button>
        </section>
      )}

      <section className="summary-strip">
        <div><span>Total records</span><strong>{items.length}</strong></div>
        <div><span>Below par</span><strong>{lowStock}</strong></div>
        <div><span>Counts needed</span><strong>{countNeeded}</strong></div>
        <div><span>Spaces</span><strong>{locations.length}</strong></div>
      </section>

      {view === "spaces" && (
        <div className="spaces-layout">
          <aside className="location-list">
            {groups.map((group) => (
              <div key={group}>
                <p>{group}</p>
                {locations.filter((location) => location.group === group).map((location) => {
                  const count = items.filter((item) => item.space === location.name).length;
                  return (
                    <button
                      className={selectedSpace === location.name ? "active" : ""}
                      key={location.name}
                      type="button"
                      onClick={() => { setSelectedSpace(location.name); setActiveZone(""); }}
                    >
                      <span>{location.name}{location.kind === "room" && <em className="room-type-label">{location.description}</em>}</span><small>{count}</small>
                    </button>
                  );
                })}
              </div>
            ))}
          </aside>

          <section className="space-content">
            <div className="space-heading">
              <div>
                <p className="eyebrow">Inventory</p>
                <h1>{currentLocation.name}{currentLocation.name === "ROOM 12" ? " (ADA)" : ""}</h1>
                <p>{currentLocation.description}</p>
              </div>
              <button className="button" type="button" onClick={() => openNewItem(selectedSpace, activeZone || currentLocation.zones[0])}>Add here</button>
            </div>

              <div className="room-dropdowns" key={selectedSpace}>
                {Array.from(new Set([...currentLocation.zones, ...currentItems.map(item => item.zone)])).map(zone => {
                  const entries = currentItems.filter(item => item.zone === zone);
                  return <details className="room-dropdown" key={zone}>
                    <summary><strong>{zone}</strong><span>{countLabel(entries.length, "item")}</span></summary>
                    <div className="compact-list">
                      {entries.map(item => <button className="compact-row" type="button" key={item.id} onClick={() => openItem(item)}>
                        {item.photo ? <img className="compact-photo" src={item.photo} alt="" /> : <span />}
                        <span><strong>{item.name}</strong>{zone.startsWith("Mini Bar —") && <small>Target: {item.par} {item.unit}</small>}</span><span className="count">{item.status === "Count needed" ? "Count needed" : `${item.quantity} ${item.unit}`}</span>
                      </button>)}
                      {!entries.length && <p className="empty-state">No items recorded yet.</p>}
                      <button className="button" type="button" onClick={() => openNewItem(selectedSpace, zone)}>Add item</button>
                    </div>
                  </details>;
                })}
              </div>
            <details className="mapping-placeholder" key={`mapping-${selectedSpace}`}>
              <summary><strong>Mapping</strong><span>Under Wrenovation</span></summary>
              <p>Under Wrenovation</p>
            </details>
            {currentLocation.kind === "conex" && (
              <details className="photo-section conex-photo-disclosure">
                <summary className="section-heading">
                  <strong>Conex source photos</strong>
                  <span>{conexPhotos.length} photographs · Expand</span>
                </summary>
                <div className="photo-grid">
                  {conexPhotos.map((photo, index) => (
                    <button key={photo} type="button" onClick={() => setGalleryIndex(index)}>
                      <img src={photo} alt={`Conex inventory source ${index + 1}`} />
                      <span>{photo.split("/").pop()?.replace(".jpg", "")}</span>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </section>
        </div>
      )}

      {view === "items" && (
        <section className="page-section">
          <div className="page-heading">
            <div><p className="eyebrow">Master inventory</p><h1>Every item, one list.</h1></div>
            <p>Search first, then open any row to update the count, room, category, reorder source, or memory.</p>
          </div>
          <section className={`inventory-accordion master-accordion ${masterInventoryOpen ? "is-open" : ""}`}>
            <div className="inventory-accordion-heading">
              <button type="button" onClick={() => setMasterInventoryOpen((open) => !open)} aria-expanded={masterInventoryOpen}>
                <span className="accordion-arrow" aria-hidden="true">→</span>
                <span><small>Filtered inventory</small><strong>Open item records</strong></span>
                <em>{countLabel(visibleItems.length, "record")}</em>
              </button>
            </div>
            {masterInventoryOpen && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Item</th><th>Space / map zone</th><th>On hand</th><th>Par</th><th>Count status</th><th>Reorder</th></tr></thead>
                  <tbody>
                    {visibleItems.slice(0, masterVisibleCount).map((item) => (
                      <tr key={item.id} onClick={() => openItem(item)}>
                        <td><strong>{item.name}</strong><small>{item.notes}</small></td>
                        <td><strong>{item.space}</strong><small>{item.zone}</small></td>
                        <td>{item.status === "Count needed" ? "Count needed" : `${item.quantity} ${item.unit}`}</td>
                        <td>{item.par || "—"}</td>
                        <td><span className={`status-label ${statusClass(item.status)}`}>{item.status}</span></td>
                        <td>{item.reorderUrl ? <a href={item.reorderUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Open link ↗</a> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ProgressiveLoadMore visibleCount={masterVisibleCount} total={visibleItems.length} onLoadMore={() => setMasterVisibleCount((current) => Math.min(visibleItems.length, current + 30))} />
                {!loading && !visibleItems.length && <div className="empty-state"><p>No items match this search.</p></div>}
              </div>
            )}
          </section>
        </section>
      )}

      {view === "stock" && <StockControls items={items} onItem={id => { const item=items.find(i=>i.id===id); if(item)openItem(item); }} />}

      {view === "memory" && (
        <section className="page-section memory-page">
          <div className="page-heading">
            <div><p className="eyebrow">Operational memory</p><h1>Leave the next person context.</h1></div>
            <p>Record a count, preferred product, storage move, vendor detail, or something worth remembering.</p>
          </div>
          <form className="memory-composer" onSubmit={(event) => { event.preventDefault(); void addMemory(generalMemory, generalMemorySpace, null); }}>
            <select value={generalMemorySpace} onChange={(event) => setGeneralMemorySpace(event.target.value)}>
              {locations.map((location) => <option key={location.name}>{location.name}</option>)}
            </select>
            <input value={generalMemory} onChange={(event) => setGeneralMemory(event.target.value)} placeholder="Add a space note or inventory memory…" />
            <button className="button button-dark" type="submit" disabled={saving || !generalMemory.trim()}>Log memory</button>
          </form>
          <div className="memory-list">
            {memories.filter((memory) => spaceFilter === "ALL SPACES" || memory.space === spaceFilter).map((memory) => (
              <article key={memory.id}>
                <div><span>{memory.space}</span>{memory.itemName && <strong>{memory.itemName}</strong>}</div>
                <p>{memory.note}</p>
                <footer>{memory.createdBy} · {formatDate(memory.createdAt)}</footer>
              </article>
            ))}
            {!memories.length && <div className="empty-state"><p>No memories yet. The first note you log will appear here.</p></div>}
          </div>
        </section>
      )}

      {mapInventory && (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMapInventory(null); }}>
          <section className="modal map-inventory-modal" role="dialog" aria-modal="true" aria-labelledby="map-inventory-title">
            <div className="drawer-header">
              <div>
                <p className="eyebrow">{mapInventory.zone}{mapInventory.mapSection ? " · Shelf section" : " · Entire area"}</p>
                <h2 id="map-inventory-title">{mapInventory.mapSection || mapInventory.zone}</h2>
              </div>
              <button className="close-map-button" type="button" onClick={() => setMapInventory(null)} aria-label="Back to the storage map"><span aria-hidden="true">←</span> Map</button>
            </div>
            <div className="map-inventory-summary">
              <span>{countLabel(mapInventoryItems.length, "record")}</span>
              <button className="button" type="button" onClick={() => { openNewItem("CONEX", mapInventory.zone, mapInventory.mapSection); setMapInventory(null); }}>Add here</button>
            </div>
            <div className="compact-list map-inventory-list">
              {mapInventoryItems.map((item) => (
                <button className="compact-row" key={item.id} type="button" onClick={() => { setMapInventory(null); openItem(item); }}>
                  {item.photo ? <img className="compact-photo" src={item.photo} alt="" /> : <span className="compact-photo compact-photo-empty" aria-hidden="true">Photo needed</span>}
                  <span className={`status-dot ${statusClass(item.status)}`} aria-hidden="true" />
                  <span><strong>{item.name}</strong><small>{item.mapSection || item.zone}</small></span>
                  <span className="count"><strong>{item.quantity}</strong><small>{item.unit}</small></span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
              {!mapInventoryItems.length && (
                <div className="empty-state"><p>No inventory is assigned to this section yet.</p><button type="button" onClick={() => { openNewItem("CONEX", mapInventory.zone, mapInventory.mapSection); setMapInventory(null); }}>Add the first item</button></div>
              )}
            </div>
          </section>
        </div>
      )}

      {selectedItem && (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedItem(null); }}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="item-title">
            <div className="drawer-header">
              <div><p className="eyebrow">{selectedItem.space} · {selectedItem.zone}</p><h2 id="item-title">{selectedItem.name}</h2></div>
              <button className="close-button" type="button" onClick={() => setSelectedItem(null)} aria-label="Close item">×</button>
            </div>
            {selectedItem.photo && <button className="item-photo" type="button" onClick={() => { const index = conexPhotos.indexOf(selectedItem.photo); if (index >= 0) setGalleryIndex(index); }}><img src={selectedItem.photo} alt={`${selectedItem.name} evidence`} /><span>Open source photo</span></button>}
            {renderItemForm("edit")}
            <LowStockReport key={selectedItem.id + selectedItem.updatedAt} item={selectedItem} />
            <section className="drawer-memory">
              <p className="eyebrow">Item memory</p>
              <textarea rows={3} value={itemMemory} onChange={(event) => setItemMemory(event.target.value)} placeholder="Log a count, move, substitution, or vendor note…" />
              <button className="button" type="button" disabled={saving || !itemMemory.trim()} onClick={() => void addMemory(itemMemory, selectedItem.space, selectedItem.id)}>Add memory</button>
              <div className="mini-memory-list">
                {memories.filter((memory) => memory.itemId === selectedItem.id).map((memory) => (
                  <article key={memory.id}><p>{memory.note}</p><small>{formatDate(memory.createdAt)}</small></article>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      {addOpen && (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddOpen(false); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title">
            <div className="drawer-header"><div><p className="eyebrow">New inventory record</p><h2 id="add-title">Add an item</h2></div><button className="close-button" type="button" onClick={() => setAddOpen(false)}>×</button></div>
            {renderItemForm("add")}
          </section>
        </div>
      )}

      {galleryIndex !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Conex photograph">
          <button className="lightbox-close" type="button" onClick={() => setGalleryIndex(null)}>Close ×</button>
          <button className="lightbox-nav" type="button" onClick={() => setGalleryIndex((galleryIndex - 1 + conexPhotos.length) % conexPhotos.length)}>←</button>
          <figure><img src={conexPhotos[galleryIndex]} alt={`Conex inventory source ${galleryIndex + 1}`} /><figcaption>{galleryIndex + 1} / {conexPhotos.length} · {conexPhotos[galleryIndex].split("/").pop()?.replace(".jpg", "")}</figcaption></figure>
          <button className="lightbox-nav" type="button" onClick={() => setGalleryIndex((galleryIndex + 1) % conexPhotos.length)}>→</button>
        </div>
      )}
    </main>
  );
}
