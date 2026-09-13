"use client";

import { useState } from "react";

type ReportItem = { name: string; space: string; zone: string; quantity: number; par: number; unit: string; unitCost?: number | null; vendor?: string; reorderUrl: string };
type Report = { reporter: string; level: string; needed: number; cost: number | null; vendor: string; url: string; notes: string };
const dollars = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
export function reportEmail(item: ReportItem, report: Report) {
  const subject = `[Nest] ${report.level}: ${item.name} — ${item.space}`;
  const body = [
    `Inventory report: ${report.level}`,
    `Item: ${item.name}`,
    `Location: ${item.space} / ${item.zone}`,
    `Reported by: ${report.reporter} (entered by reporter)`,
    `On hand: ${item.quantity} ${item.unit}`,
    `Par level: ${item.par} ${item.unit}`,
    `Quantity needed: ${report.needed} ${item.unit}`,
    `Unit price: ${report.cost === null ? "Not recorded — needs confirmation" : dollars(report.cost) + " per " + item.unit}`,
    `Estimated goods total: ${report.cost === null ? "Not available" : dollars(report.cost * report.needed)} (excludes shipping and tax)`,
    `Order from: ${report.vendor || "Not recorded — needs confirmation"}`,
    `Order link: ${report.url || "Not recorded — needs confirmation"}`,
    `Notes: ${report.notes || "None"}`,
    "", "This is a stock report, not a purchase order or approval.",
  ].join("\n");
  return { subject, body, href: `mailto:eric@hotelwren29.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

export default function LowStockReport({ item }: { item: ReportItem }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  return <section className="low-stock-report">
    <button className="button" type="button" aria-expanded={open} onClick={() => { setOpen(!open); setMessage(""); }}>Notify manager of low inventory</button>
    {open && <form className="item-form" onSubmit={event => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const rawCost = String(values.get("cost") || "").trim();
      const report: Report = { reporter: String(values.get("reporter") || "").trim(), level: String(values.get("level")), needed: Number(values.get("needed")), cost: rawCost === "" ? null : Number(rawCost), vendor: String(values.get("vendor") || "").trim(), url: String(values.get("url") || "").trim(), notes: String(values.get("notes") || "").trim() };
      if (!report.reporter || !Number.isFinite(report.needed) || report.needed <= 0 || (report.cost !== null && (!Number.isFinite(report.cost) || report.cost < 0))) { setMessage("Enter your name, a quantity greater than zero, and a valid unit price if known."); return; }
      if (report.url && !/^https?:\/\//i.test(report.url)) { setMessage("Use an order link starting with https:// or http://."); return; }
      window.location.href = reportEmail(item, report).href;
      setMessage("Email draft requested. Review and send it in your email app; Nest cannot confirm delivery.");
    }}>
      <p>Email Eric at eric@hotelwren29.com. Review the details below, then send from your email app.</p>
      <div className="form-grid">
        <label>Your name<input name="reporter" autoComplete="name" required maxLength={100} /></label>
        <label>Stock status<select name="level"><option>Running low</option><option>Low inventory</option><option>Out of stock</option></select></label>
        <label>Quantity needed ({item.unit})<input name="needed" type="number" min="0.01" step="any" required defaultValue={Math.max(0, item.par - item.quantity) || ""} /></label>
        <label>Unit price ($ per {item.unit})<input name="cost" type="number" min="0" step="0.01" defaultValue={item.unitCost ?? ""} placeholder="Unknown" /></label>
        <label>Order from<input name="vendor" defaultValue={item.vendor || ""} maxLength={200} placeholder="Vendor name" /></label>
        <label>Order link<input name="url" type="url" defaultValue={item.reorderUrl} placeholder="https://…" maxLength={1500} /></label>
      </div>
      <label>Notes<textarea name="notes" rows={2} maxLength={1000} /></label>
      <p>Missing prices or vendor details will be marked as needing confirmation. This uses the item details currently shown above; save changes to keep them.</p>
      <button className="button button-dark" type="submit">Open email to Eric</button>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>;
}
