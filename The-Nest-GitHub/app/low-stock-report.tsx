"use client";

import { useState } from "react";

type ReportItem = { id: number; name: string; space: string; zone: string; quantity: number; par: number; unit: string; unitCost?: number | null; vendor?: string; reorderUrl: string };
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
  const [busy, setBusy] = useState(false);
  return <section className="low-stock-report">
    <button className="button" type="button" aria-expanded={open} onClick={() => { setOpen(!open); setMessage(""); }}>Notify manager of low inventory</button>
    {open && <form className="item-form" onSubmit={async event => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const rawCost = String(values.get("cost") || "").trim();
      const report: Report = { reporter: "Signed-in staff", level: String(values.get("level")), needed: Number(values.get("needed")), cost: rawCost === "" ? null : Number(rawCost), vendor: String(values.get("vendor") || "").trim(), url: String(values.get("url") || "").trim(), notes: String(values.get("notes") || "").trim() };
      if (!report.reporter || !Number.isFinite(report.needed) || report.needed <= 0 || (report.cost !== null && (!Number.isFinite(report.cost) || report.cost < 0))) { setMessage("Enter your name, a quantity greater than zero, and a valid unit price if known."); return; }
      if (report.url && !/^https?:\/\//i.test(report.url)) { setMessage("Use an order link starting with https:// or http://."); return; }
      setBusy(true); setMessage("");
      try {
        const response = await fetch("/api/notifications", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({itemId:item.id,needed:report.needed,level:report.level,notes:report.notes})});
        const result = await response.json();
        if(!response.ok) throw new Error(result.error || "Report could not be sent.");
        setMessage("Sent to Eric’s manager inbox.");
      } catch(error) { setMessage(error instanceof Error ? error.message : "Report could not be sent. Please retry."); }
      finally { setBusy(false); }
    }}>
      <p>Send a stock report to Eric’s manager inbox. Your signed-in account identifies the reporter.</p>
      <div className="form-grid">
        <label>Stock status<select name="level"><option>Running low</option><option>Low inventory</option><option>Out of stock</option></select></label>
        <label>Quantity needed ({item.unit})<input name="needed" type="number" min="0.01" step="any" required defaultValue={Math.max(0, item.par - item.quantity) || ""} /></label>
      </div>
      <label>Notes<textarea name="notes" rows={2} maxLength={1000} /></label>
      <p>This report uses the saved inventory item. Save item changes before reporting.</p>
      <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Sending…" : "Send report to manager"}</button>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>;
}
