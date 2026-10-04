"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import "./count-item.css";

type CountableItem = { id: number; name: string; space: string; zone: string; mapSection: string; quantity: number; unit: string };

export default function CountItem({ items, onSave, onClose }: {
  items: CountableItem[];
  onSave: (id: number, quantity: number) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const countInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [space, setSpace] = useState("");
  const [itemId, setItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selected = items.find(item => item.id === itemId);
  const matches = items.filter(item => (!space || item.space === space) &&
    [item.name, item.space, item.zone, item.mapSection].some(value => value.toLowerCase().includes(search.trim().toLowerCase())));

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { (itemId === null ? searchInput : countInput).current?.focus(); }, [itemId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || !selected) return;
    const count = Number(quantity);
    if (!quantity.trim() || !Number.isFinite(count) || count < 0) {
      setError("Enter a count of zero or more.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(selected.id, count);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The count could not be saved. Please try again.");
    } finally { setSaving(false); }
  }

  return <dialog ref={dialog} className="count-dialog" aria-labelledby="count-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="drawer-header">
      <h2 id="count-title">Count item</h2>
      <button className="close-button" type="button" aria-label="Close count item" disabled={saving} onClick={onClose}>×</button>
    </div>
    {selected ? <form onSubmit={submit}>
      <button className="text-button" type="button" disabled={saving} onClick={() => { setItemId(null); setQuantity(""); setError(""); }}>← Choose another item</button>
      <h3>{selected.name}</h3>
      <p>{[selected.space, selected.zone, selected.mapSection].filter(Boolean).join(" · ")}</p>
      <p>Recorded quantity: {selected.quantity} {selected.unit}</p>
      <label className="count-field">Quantity counted ({selected.unit})
        <input ref={countInput} required type="number" min="0" step="any" inputMode="decimal" value={quantity} disabled={saving} onChange={event => setQuantity(event.target.value)} />
      </label>
      <p className="count-hint">Saving replaces the recorded quantity and marks this item confirmed.</p>
      {error && <p role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-dark" type="submit" disabled={saving || !quantity.trim()}>{saving ? "Saving…" : "Save count"}</button></div>
    </form> : <>
      <p>Choose the item you counted.</p>
      <label className="count-field">Search items<input ref={searchInput} value={search} onChange={event => setSearch(event.target.value)} placeholder="Item, room, or storage area" /></label>
      <label className="count-field">Space<select value={space} onChange={event => setSpace(event.target.value)}><option value="">All spaces</option>{Array.from(new Set(items.map(item => item.space))).sort().map(name => <option key={name}>{name}</option>)}</select></label>
      <div className="count-results">{matches.slice(0, 50).map(item => <button className="count-choice" key={item.id} type="button" onClick={() => { setItemId(item.id); setQuantity(""); }}><strong>{item.name}</strong><span>{[item.space, item.zone, item.mapSection].filter(Boolean).join(" · ")}</span></button>)}
        {!matches.length && <p>No items match. Try another search or space.</p>}
        {matches.length > 50 && <p>Showing the first 50 matches. Search or choose a space to narrow the list.</p>}
      </div>
    </>}
  </dialog>;
}
