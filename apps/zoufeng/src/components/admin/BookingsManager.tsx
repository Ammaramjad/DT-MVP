"use client";

import { Download, Loader2, Search, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatDateTime, money } from "@/lib/format";
import { BOOKING_STATUSES, statusLabels } from "@/lib/i18n";
import { Badge, Modal } from "./ui";

export interface AdminBooking {
  id: number;
  code: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  categoryId: number | null;
  vehicleId: number | null;
  driverId: number | null;
  pickup: string;
  dropoff: string;
  pickupAt: string;
  passengers: number;
  luggage: number;
  hours: number;
  days: number;
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  flightNo: string;
  notes: string;
  rating: number | null;
  createdAt: string;
}
type Opt = { id: number; name: string };

export function BookingsManager({ rows, total, page, pageSize, categories, vehicles, drivers }: { rows: AdminBooking[]; total: number; page: number; pageSize: number; categories: Opt[]; vehicles: Opt[]; drivers: (Opt & { status: string })[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [sel, setSel] = useState<AdminBooking | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const nav = (patch: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!("page" in patch)) p.delete("page");
    router.push(`${path}?${p}`);
  };
  const name = (list: Opt[], id: number | null) => list.find((x) => x.id === id)?.name ?? "—";

  const update = async (body: Record<string, unknown>) => {
    if (!sel) return;
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/admin/bookings/${sel.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(data.error || "Update failed");
    setSel(data);
    router.refresh();
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const exportHref = `/api/admin/bookings/export?${new URLSearchParams(Array.from(sp.entries()).filter(([k]) => k !== "page"))}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {["", ...BOOKING_STATUSES].map((s) => (
          <button key={s || "all"} onClick={() => nav({ status: s })} className={(sp.get("status") ?? "") === s ? "skeuo-btn px-3.5 py-1.5 text-[12.5px]" : "neu-sm px-3.5 py-1.5 text-[12.5px] font-semibold"}>
            {s ? statusLabels[s].en : "All"}
          </button>
        ))}
      </div>
      <form
        className="neu flex flex-wrap items-center gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          nav({ q });
        }}
      >
        <label className="neu-inset flex min-w-[220px] flex-1 items-center gap-2 px-3">
          <Search size={15} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, name, phone, place…" className="field-input py-2.5 text-[13px]" />
        </label>
        <select value={sp.get("category") ?? ""} onChange={(e) => nav({ category: e.target.value })} className="input !w-auto !py-2 text-[12.5px]" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input type="date" value={sp.get("from") ?? ""} onChange={(e) => nav({ from: e.target.value })} className="input !w-auto !py-2 text-[12.5px]" aria-label="From" />
        <input type="date" value={sp.get("to") ?? ""} onChange={(e) => nav({ to: e.target.value })} className="input !w-auto !py-2 text-[12.5px]" aria-label="To" />
        <button className="skeuo-btn-light px-4 py-2 text-[13px]">Search</button>
        <a href={exportHref} className="skeuo-btn flex items-center gap-1.5 px-4 py-2 text-[13px]">
          <Download size={14} /> CSV
        </a>
      </form>

      <div className="neu overflow-x-auto p-2">
        <table className="w-full min-w-[980px] text-[12.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              {["Code", "Customer", "Service", "Route", "Pickup time", "Vehicle", "Driver", "Total", "Payment", "Status"].map((h) => (
                <th key={h} className="px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={10} className="py-10 text-center text-muted">No bookings found</td></tr>
            )}
            {rows.map((b) => (
              <tr key={b.id} onClick={() => { setErr(""); setSel(b); }} className="cursor-pointer border-t border-white/70 hover:bg-white/60">
                <td className="px-3 py-2.5 font-mono font-bold text-brand">{b.code}</td>
                <td className="px-3"><div className="font-semibold">{b.contactName}</div><div className="text-muted">{b.contactPhone}</div></td>
                <td className="px-3">{name(categories, b.categoryId)}</td>
                <td className="max-w-[220px] truncate px-3">{b.pickup}{b.dropoff && ` → ${b.dropoff}`}</td>
                <td className="whitespace-nowrap px-3">{formatDateTime(b.pickupAt, "en")}</td>
                <td className="px-3">{name(vehicles, b.vehicleId)}</td>
                <td className="px-3">{b.driverId ? name(drivers, b.driverId) : <span className="text-hot">Unassigned</span>}</td>
                <td className="px-3 font-bold">{money(b.total)}</td>
                <td className="px-3"><span className={b.paymentStatus === "paid" ? "text-emerald-600" : "text-muted"}>{b.paymentStatus}</span></td>
                <td className="px-3"><Badge color={statusLabels[b.status]?.color ?? "#999"}>{statusLabels[b.status]?.en ?? b.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-[12.5px] text-muted">
        <span>{total} bookings · page {page}/{pages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => nav({ page: String(page - 1) })} className="skeuo-btn-light px-3 py-1.5 disabled:opacity-40">Prev</button>
          <button disabled={page >= pages} onClick={() => nav({ page: String(page + 1) })} className="skeuo-btn-light px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title={`Booking ${sel?.code ?? ""}`} wide>
        {sel && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="neu-flat space-y-1.5 p-4 text-[13px]">
              <div className="mb-2"><Badge color={statusLabels[sel.status]?.color ?? "#999"}>{statusLabels[sel.status]?.en}</Badge></div>
              <div><b>Service:</b> {name(categories, sel.categoryId)}</div>
              <div><b>Pickup:</b> {sel.pickup}</div>
              {sel.dropoff && <div><b>Drop-off:</b> {sel.dropoff}</div>}
              <div><b>Time:</b> {formatDateTime(sel.pickupAt, "en")}</div>
              <div><b>Passengers/bags:</b> {sel.passengers} / {sel.luggage}{sel.hours ? ` · ${sel.hours}h` : ""}{sel.days ? ` · ${sel.days}d` : ""}</div>
              {sel.flightNo && <div><b>Flight:</b> {sel.flightNo}</div>}
              <div><b>Customer:</b> {sel.contactName} · <a className="text-brand" href={`tel:${sel.contactPhone}`}>{sel.contactPhone}</a> {sel.contactEmail}</div>
              <div><b>Price:</b> {money(sel.subtotal)}{sel.discount ? ` − ${money(sel.discount)} (${sel.promoCode})` : ""} = <b className="text-brand">{money(sel.total)}</b></div>
              <div><b>Payment:</b> {sel.paymentMethod} · {sel.paymentStatus}</div>
              {sel.rating && <div><b>Rating:</b> {"★".repeat(sel.rating)}</div>}
              {sel.notes && <div className="rounded-xl bg-white/70 p-2"><b>Notes:</b> {sel.notes}</div>}
              <div className="text-[11.5px] text-muted">Created {sel.createdAt}</div>
            </div>
            <div className="flex flex-col gap-3 text-[12.5px] font-semibold">
              <label className="flex flex-col gap-1">Status
                <select value={sel.status} onChange={(e) => update({ status: e.target.value })} className="input">
                  {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{statusLabels[s].en} · {statusLabels[s].zh}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">Assign driver
                <select value={sel.driverId ?? ""} onChange={(e) => update({ driverId: e.target.value ? Number(e.target.value) : null })} className="input">
                  <option value="">— Unassigned —</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.status})</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">Vehicle
                <select value={sel.vehicleId ?? ""} onChange={(e) => update({ vehicleId: e.target.value ? Number(e.target.value) : null })} className="input">
                  <option value="">—</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">Payment status
                <select value={sel.paymentStatus} onChange={(e) => update({ paymentStatus: e.target.value })} className="input">
                  {["unpaid", "paid", "refunded"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">Total (NT$)
                <input type="number" defaultValue={sel.total} key={`t${sel.id}${sel.total}`} onBlur={(e) => Number(e.target.value) !== sel.total && update({ total: Math.round(Number(e.target.value)) })} className="input" />
              </label>
              <div className="flex gap-2">
                {sel.status === "pending" && <button onClick={() => update({ status: "confirmed" })} className="skeuo-btn flex-1 py-2.5">Confirm</button>}
                {["assigned", "confirmed"].includes(sel.status) && <button onClick={() => update({ status: "in_progress" })} className="skeuo-btn flex-1 py-2.5">Start trip</button>}
                {sel.status === "in_progress" && <button onClick={() => update({ status: "completed", paymentStatus: "paid" })} className="skeuo-btn flex-1 py-2.5">Complete</button>}
                <button
                  onClick={async () => {
                    if (!confirm(`Delete booking ${sel.code}?`)) return;
                    const r = await fetch(`/api/admin/bookings/${sel.id}`, { method: "DELETE" });
                    if (r.ok) { setSel(null); router.refresh(); } else setErr("Delete failed");
                  }}
                  className="skeuo-btn-light skeuo-danger flex items-center gap-1 px-3 py-2.5"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {busy && <Loader2 size={16} className="animate-spin text-brand" />}
              {err && <p className="text-hot">{err}</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
