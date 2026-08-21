"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  conexPhotos,
  locations,
  roomMinibarSeedItems,
  seedItems,
  type LocationDefinition,
} from "@/lib/inventory-data";
import { housekeepingSeedItems } from "@/lib/housekeeping-data";
import { guestRoomSeedItems } from "@/lib/guest-room-data";
import { propertySeedItems } from "@/lib/property-data";

type Item = {
  id: number;
  name: string;
  space: string;
  zone: string;
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

function seededInventory(): Item[] {
  const timestamp = new Date().toISOString();
  const completeSeed = [
    ...seedItems,
    ...roomMinibarSeedItems,
    ...housekeepingSeedItems,
    ...guestRoomSeedItems,
    ...propertySeedItems,
  ];

  return completeSeed.map((item, index) => ({
    id: index + 1,
    reorderUrl: "",
    ...item,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

const emptyDraft = (space = "CONEX", zone = "Entry"): ItemDraft => ({
  name: "",
  space,
  zone,
  quantity: 0,
  par: 0,
  unit: "each",
  status: "Count needed",
  reorderUrl: "",
  notes: "",
  photo: "",
});

const groups = ["Shared spaces", "Residence", "Guest rooms"] as const;

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

function LocationMap({
  location,
  activeZone,
  items,
  onZone,
}: {
  location: LocationDefinition;
  activeZone: string;
  items: Item[];
  onZone: (zone: string) => void;
}) {
  return (
    <div className={`location-map map-${location.kind}`} aria-label={`${location.name} inventory map`}>
      <div className="map-caption">
        <span>{location.name}</span>
        <span>{location.kind === "room" ? "Isometric room plan" : "Clickable spatial map"}</span>
      </div>
      {location.kind === "conex" ? (
        <div className="conex-visual">
          <figure className="conex-reference-photo">
            <img src="/conex/IMG_4317.jpg" alt="Interior view from the Conex entry toward the rear shelving bay" />
          </figure>
          <div className="conex-u-map">
            {[
              { zone: "Room supplies shelf", className: "conex-shelf conex-shelf-front-right", levelLabels: ["Room back stock", "Room amenities", "Room replacements"] },
              { zone: "Linen shelf", className: "conex-shelf conex-shelf-mid-right", levelLabels: ["Top linen", "Folded linen", "Bulk linen"] },
              { zone: "Tools shelf", className: "conex-shelf conex-shelf-rear-left", levelLabels: ["Maintenance", "Tools", "Paint + parts"] },
              { zone: "Rear stock shelf", className: "conex-shelf conex-shelf-rear-back", levelLabels: ["Electrical", "Hardware", "Materials"] },
              { zone: "Lighting shelf", className: "conex-shelf conex-shelf-rear-right", levelLabels: ["Light fixtures", "Lighting", "Large parts"] },
            ].map(({ zone, className, levelLabels }) => {
              const count = items.filter((item) => item.zone === zone).length;
              return (
                <button
                  className={`${className} ${activeZone === zone ? "is-active" : ""}`}
                  key={zone}
                  type="button"
                  onClick={() => onZone(activeZone === zone ? "" : zone)}
                >
                  <span className="conex-shelf-name">{zone}</span>
                  <span className="conex-levels" aria-hidden="true">
                    {levelLabels.map((label) => <i key={label}>{label}</i>)}
                  </span>
                  <small>{count ? countLabel(count, "item") : "Empty"}</small>
                </button>
              );
            })}
            <span className="conex-aisle" aria-hidden="true">CLEAR AISLE</span>
            <span className="conex-rear-threshold" aria-hidden="true">REAR BAY</span>
            <button
              className={`conex-floor-stock ${activeZone === "Floor stock / water" ? "is-active" : ""}`}
              type="button"
              onClick={() => onZone(activeZone === "Floor stock / water" ? "" : "Floor stock / water")}
            >
              <span>Floor stock / water</span>
              <small>{countLabel(items.filter((item) => item.zone === "Floor stock / water").length, "item")}</small>
            </button>
            <button
              className={`conex-appliances ${activeZone === "Appliances + table" ? "is-active" : ""}`}
              type="button"
              onClick={() => onZone(activeZone === "Appliances + table" ? "" : "Appliances + table")}
            >
              <span className="conex-mini-fridge" aria-hidden="true">FRIDGE</span>
              <span className="conex-microwave" aria-hidden="true">MICROWAVE</span>
              <span className="conex-table" aria-hidden="true">TABLE</span>
              <strong>Appliances + table</strong>
            </button>
            <button
              className={`conex-door ${activeZone === "Entry" ? "is-active" : ""}`}
              type="button"
              onClick={() => onZone(activeZone === "Entry" ? "" : "Entry")}
            >
              ROLL-UP DOOR
            </button>
            <button
              className={`conex-side-door ${activeZone === "Entry" ? "is-active" : ""}`}
              type="button"
              onClick={() => onZone(activeZone === "Entry" ? "" : "Entry")}
            >
              SIDE ENTRY
            </button>
          </div>
        </div>
      ) : (
        <div className="map-scene">
          <div className="map-back-wall" aria-hidden="true" />
          <div className="map-side-wall" aria-hidden="true" />
          <div className="map-grid">
            {location.zones.map((zone, index) => {
              const count = items.filter((item) => item.zone === zone).length;
              return (
                <button
                  className={`map-zone zone-${index + 1} ${activeZone === zone ? "is-active" : ""}`}
                  key={zone}
                  type="button"
                  onClick={() => onZone(activeZone === zone ? "" : zone)}
                >
                  <i className="zone-shape" aria-hidden="true" />
                  <span>{zone}</span>
                  <small>{count ? countLabel(count, "item") : "Empty"}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="map-orientation" aria-hidden="true">
        <span>BACK WALL</span>
        <span>{location.kind === "conex" ? "ROLL-UP ENTRY" : "ENTRY / PATH"}</span>
      </div>
    </div>
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

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"items" | "spaces" | "memory">("spaces");
  const [search, setSearch] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("ALL SPACES");
  const [selectedSpace, setSelectedSpace] = useState("CONEX");
  const [activeZone, setActiveZone] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft());
  const [addOpen, setAddOpen] = useState(false);
  const [itemMemory, setItemMemory] = useState("");
  const [generalMemory, setGeneralMemory] = useState("");
  const [generalMemorySpace, setGeneralMemorySpace] = useState("CONEX");
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  function loadData() {
    setLoading(true);
    setError("");
    try {
      const savedItems = window.localStorage.getItem(inventoryStorageKey);
      const savedMemories = window.localStorage.getItem(memoryStorageKey);
      setItems(savedItems ? JSON.parse(savedItems) as Item[] : seededInventory());
      setMemories(savedMemories ? JSON.parse(savedMemories) as Memory[] : []);
      setHydrated(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inventory could not be loaded.");
      setItems(seededInventory());
      setMemories([]);
      setHydrated(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(inventoryStorageKey, JSON.stringify(items));
    window.localStorage.setItem(memoryStorageKey, JSON.stringify(memories));
  }, [hydrated, items, memories]);

  const currentLocation = locations.find((location) => location.name === selectedSpace) || locations[0];
  const currentItems = useMemo(
    () => items.filter((item) => item.space === selectedSpace),
    [items, selectedSpace]
  );

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSpace = spaceFilter === "ALL SPACES" || item.space === spaceFilter;
      const matchesSearch = !needle || [item.name, item.space, item.zone, item.notes, item.unit]
        .some((value) => value.toLowerCase().includes(needle));
      return matchesSpace && matchesSearch;
    });
  }, [items, search, spaceFilter]);

  const lowStock = items.filter((item) => item.par > 0 && item.quantity < item.par).length;
  const countNeeded = items.filter((item) => item.status === "Count needed").length;

  function openItem(item: Item) {
    setSelectedItem(item);
    setDraft({
      name: item.name,
      space: item.space,
      zone: item.zone,
      quantity: item.quantity,
      par: item.par,
      unit: item.unit,
      status: item.status,
      reorderUrl: item.reorderUrl,
      notes: item.notes,
      photo: item.photo,
    });
  }

  function openNewItem(space = selectedSpace, zone = activeZone || currentLocation.zones[0]) {
    setDraft(emptyDraft(space, zone));
    setAddOpen(true);
  }

  function changeDraft<Key extends keyof ItemDraft>(key: Key, value: ItemDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function syncZoneForSpace(space: string) {
    const location = locations.find((entry) => entry.name === space);
    setDraft((current) => ({ ...current, space, zone: location?.zones[0] || "Entry" }));
  }

  function submitNewItem(event: FormEvent) {
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
      setItems((current) => [...current, item]);
      setAddOpen(false);
      setSelectedSpace(item.space);
      setActiveZone("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Item could not be added.");
    } finally {
      setSaving(false);
    }
  }

  function saveItem(event: FormEvent) {
    event.preventDefault();
    if (!selectedItem) return;
    setSaving(true);
    try {
      const item: Item = { ...selectedItem, ...draft, updatedAt: new Date().toISOString() };
      setItems((current) => current.map((currentItem) => currentItem.id === item.id ? item : currentItem));
      setSelectedItem(item);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function addMemory(note: string, space: string, itemId: number | null) {
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
        createdBy: "Wren team",
        createdAt: new Date().toISOString(),
      };
      setMemories((current) => [memory, ...current]);
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
            <select value={draft.zone} onChange={(event) => changeDraft("zone", event.target.value)}>
              {location.zones.map((zone) => <option key={zone}>{zone}</option>)}
            </select>
          </Field>
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
          <Field label="Unit">
            <input value={draft.unit} onChange={(event) => changeDraft("unit", event.target.value)} placeholder="each, case, roll…" />
          </Field>
          <Field label="Reorder link (optional)">
            <input type="url" value={draft.reorderUrl} onChange={(event) => changeDraft("reorderUrl", event.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Product image (recommended)">
            <input value={draft.photo} onChange={(event) => changeDraft("photo", event.target.value)} placeholder="/products/item.png or https://…" />
          </Field>
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
        <button className="brand" type="button" onClick={() => { setView("spaces"); setSelectedSpace("CONEX"); }}>
          <img src="/hotel-wren-logotype-brown.png" alt="Hotel Wren" />
          <span>Inventory</span>
        </button>
        <nav className="topnav" aria-label="Inventory views">
          <button className={view === "spaces" ? "active" : ""} onClick={() => setView("spaces")}>Space maps</button>
          <button className={view === "items" ? "active" : ""} onClick={() => setView("items")}>All items</button>
          <button className={view === "memory" ? "active" : ""} onClick={() => setView("memory")}>Memory</button>
        </nav>
        <button className="button button-dark" type="button" onClick={() => openNewItem()}>Add item</button>
      </header>

      <section className="searchbar" aria-label="Inventory search">
        <label className="search-field">
          <span className="sr-only">Search inventory</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); if (event.target.value && view !== "items") setView("items"); }} placeholder="Search item, room, zone, or note" />
        </label>
        <select aria-label="Filter by space" value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)}>
          <option>ALL SPACES</option>
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
        <div><span>Mapped spaces</span><strong>{locations.length}</strong></div>
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
                      onClick={() => { setSelectedSpace(location.name); setActiveZone(location.kind === "room" ? "Minibar" : ""); }}
                    >
                      <span>{location.name}</span><small>{count}</small>
                    </button>
                  );
                })}
              </div>
            ))}
          </aside>

          <section className="space-content">
            <div className="space-heading">
              <div>
                <p className="eyebrow">Inventory map</p>
                <h1>{currentLocation.name}</h1>
                <p>{currentLocation.description}</p>
              </div>
              <button className="button" type="button" onClick={() => openNewItem(selectedSpace, activeZone || currentLocation.zones[0])}>Add here</button>
            </div>

            {currentLocation.kind === "room" && (
              <nav className="room-category-tabs" aria-label={`${currentLocation.name} inventory categories`}>
                {currentLocation.zones.map((category) => (
                  <button
                    className={activeZone === category ? "active" : ""}
                    key={category}
                    type="button"
                    onClick={() => setActiveZone(category)}
                  >
                    <span>{category}</span>
                    <small>{countLabel(currentItems.filter((item) => item.zone === category).length, "record")}</small>
                  </button>
                ))}
              </nav>
            )}

            <LocationMap location={currentLocation} activeZone={activeZone} items={currentItems} onZone={setActiveZone} />

            <div className="zone-heading">
              <div>
                <p className="eyebrow">{activeZone || "Entire space"}</p>
                <h2>{activeZone ? `Items in ${activeZone}` : `All ${currentLocation.name} inventory`}</h2>
              </div>
              {activeZone && currentLocation.kind !== "room" && <button className="text-button" type="button" onClick={() => setActiveZone("")}>Clear zone</button>}
            </div>

            <div className="compact-list">
              {currentItems.filter((item) => !activeZone || item.zone === activeZone).map((item) => (
                <button className="compact-row" key={item.id} type="button" onClick={() => openItem(item)}>
                  {item.photo ? <img className="compact-photo" src={item.photo} alt="" /> : <span className="compact-photo compact-photo-empty" aria-hidden="true">Photo needed</span>}
                  <span className={`status-dot ${statusClass(item.status)}`} aria-hidden="true" />
                  <span><strong>{item.name}</strong><small>{item.zone}</small></span>
                  <span className="count"><strong>{item.quantity}</strong><small>{item.unit}</small></span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
              {!loading && !currentItems.filter((item) => !activeZone || item.zone === activeZone).length && (
                <div className="empty-state"><p>No inventory has been placed here yet.</p><button type="button" onClick={() => openNewItem(selectedSpace, activeZone || currentLocation.zones[0])}>Add the first item</button></div>
              )}
              {loading && <div className="empty-state"><p>Loading inventory…</p></div>}
            </div>

            {currentLocation.kind === "conex" && (
              <section className="photo-section">
                <div className="section-heading">
                  <div><p className="eyebrow">Visual audit</p><h2>Conex source photos</h2></div>
                  <span>{conexPhotos.length} photographs</span>
                </div>
                <div className="photo-grid">
                  {conexPhotos.map((photo, index) => (
                    <button key={photo} type="button" onClick={() => setGalleryIndex(index)}>
                      <img src={photo} alt={`Conex inventory source ${index + 1}`} />
                      <span>{photo.split("/").pop()?.replace(".jpg", "")}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </section>
        </div>
      )}

      {view === "items" && (
        <section className="page-section">
          <div className="page-heading">
            <div><p className="eyebrow">Master inventory</p><h1>Every item, one list.</h1></div>
            <p>Search first, then open any row to update the count, room, exact map position, reorder source, or memory.</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Space / map zone</th><th>On hand</th><th>Par</th><th>Count status</th><th>Reorder</th></tr></thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id} onClick={() => openItem(item)}>
                    <td><strong>{item.name}</strong><small>{item.notes}</small></td>
                    <td><strong>{item.space}</strong><small>{item.zone}</small></td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>{item.par || "—"}</td>
                    <td><span className={`status-label ${statusClass(item.status)}`}>{item.status}</span></td>
                    <td>{item.reorderUrl ? <a href={item.reorderUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Open link ↗</a> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !visibleItems.length && <div className="empty-state"><p>No items match this search.</p></div>}
          </div>
        </section>
      )}

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

      {selectedItem && (
        <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedItem(null); }}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="item-title">
            <div className="drawer-header">
              <div><p className="eyebrow">{selectedItem.space} · {selectedItem.zone}</p><h2 id="item-title">{selectedItem.name}</h2></div>
              <button className="close-button" type="button" onClick={() => setSelectedItem(null)} aria-label="Close item">×</button>
            </div>
            {selectedItem.photo && <button className="item-photo" type="button" onClick={() => { const index = conexPhotos.indexOf(selectedItem.photo); if (index >= 0) setGalleryIndex(index); }}><img src={selectedItem.photo} alt={`${selectedItem.name} evidence`} /><span>Open source photo</span></button>}
            {renderItemForm("edit")}
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
