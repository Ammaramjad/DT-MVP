"use client";

import { Check, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Field, Resource } from "@/lib/admin-resources";
import { Icon } from "@/lib/icons";
import { IconField } from "./IconField";
import { ImageField } from "./ImageField";
import { Modal, Toggle } from "./ui";

type Row = Record<string, unknown> & { id: number };
type Options = Record<string, { value: string; label: string }[]>;

function emptyFor(fields: Field[]) {
  const o: Record<string, unknown> = {};
  for (const f of fields) o[f.name] = f.default ?? (f.type === "bool" ? false : f.type === "number" || f.type === "float" ? 0 : f.type === "relation" ? "" : "");
  return o;
}

export function CrudManager({ resource, options }: { resource: Resource; options: Options }) {
  const r = resource;
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const pageSize = 25;
  const filterFields = useMemo(() => r.fields.filter((f) => f.type === "relation" || f.type === "select" || f.type === "bool").slice(0, 3), [r]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ q, page: String(page), pageSize: String(pageSize) });
    Object.entries(filter).forEach(([k, v]) => v !== "" && p.set(`f_${k}`, v));
    const res = await fetch(`/api/admin/r/${r.key}?${p}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [q, page, filter, r.key]);

  useEffect(() => {
    const id = setTimeout(load, 200);
    return () => clearTimeout(id);
  }, [load]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setErr("");
    const id = editing.id as number | undefined;
    const res = await fetch(id ? `/api/admin/r/${r.key}/${id}` : `/api/admin/r/${r.key}`, { method: id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(editing) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setErr(data.error || "Save failed");
    setEditing(null);
    flash(id ? "Saved ✓" : "Created ✓");
    load();
  };

  const patch = async (row: Row, body: Record<string, unknown>) => {
    setRows((rs) => rs.map((x) => (x.id === row.id ? { ...x, ...body } : x)));
    const res = await fetch(`/api/admin/r/${r.key}/${row.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      flash((await res.json().catch(() => ({}))).error || "Update failed");
      load();
    }
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete “${String(row[r.labelField] ?? row.id)}”? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/r/${r.key}/${row.id}`, { method: "DELETE" });
    if (!res.ok) flash((await res.json().catch(() => ({}))).error || "Delete failed");
    else flash("Deleted");
    load();
  };

  const fieldOf = (name: string) => r.fields.find((f) => f.name === name);
  const cell = (row: Row, name: string) => {
    const v = row[name];
    const f = fieldOf(name);
    if (name === "createdAt") return <span className="whitespace-nowrap text-muted">{String(v ?? "").slice(0, 16).replace("T", " ")}</span>;
    if (!f) return String(v ?? "");
    switch (f.type) {
      case "image":
        return v ? <img src={String(v)} alt="" className="h-10 w-14 rounded-lg object-cover" /> : <span className="neu-inset block h-10 w-14" />;
      case "icon":
        return <Icon name={String(v)} size={18} />;
      case "bool":
        return <Toggle checked={Boolean(v)} onChange={(c) => patch(row, { [name]: c })} label={f.label} />;
      case "relation":
        return options[name]?.find((o) => o.value === String(v))?.label ?? <span className="text-muted">—</span>;
      case "select":
        return <span className="neu-inset !rounded-full px-2 py-0.5 text-[11.5px]">{f.options?.find((o) => o.value === v)?.label ?? String(v)}</span>;
      case "color":
        return <span className="inline-block h-5 w-5 rounded-full border border-white shadow" style={{ background: String(v) }} />;
      default:
        return <span className="line-clamp-2 max-w-[260px]">{String(v ?? "")}</span>;
    }
  };

  const input = (f: Field) => {
    if (!editing) return null;
    const v = editing[f.name];
    const set = (nv: unknown) => setEditing((e) => ({ ...e, [f.name]: nv }));
    switch (f.type) {
      case "textarea":
        return <textarea rows={3} value={String(v ?? "")} onChange={(e) => set(e.target.value)} className="input resize-y" required={f.required} />;
      case "bool":
        return (
          <div className="pt-1">
            <Toggle checked={Boolean(v)} onChange={set} label={f.label} />
          </div>
        );
      case "select":
        return (
          <select value={String(v ?? "")} onChange={(e) => set(e.target.value)} className="input">
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case "relation":
        return (
          <select value={v === null || v === undefined ? "" : String(v)} onChange={(e) => set(e.target.value)} className="input" required={f.required}>
            <option value="">— none —</option>
            {options[f.name]?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case "image":
        return <ImageField value={String(v ?? "")} onChange={set} />;
      case "icon":
        return <IconField value={String(v ?? "")} onChange={set} />;
      case "color":
        return (
          <div className="flex gap-2">
            <input type="color" value={String(v || "#3b82f6")} onChange={(e) => set(e.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border-0 bg-transparent" />
            <input value={String(v ?? "")} onChange={(e) => set(e.target.value)} className="input" />
          </div>
        );
      case "number":
      case "float":
        return <input type="number" step={f.type === "float" ? "any" : 1} value={String(v ?? 0)} onChange={(e) => set(e.target.value)} className="input" required={f.required} />;
      case "date":
        return <input type="date" value={String(v ?? "")} onChange={(e) => set(e.target.value)} className="input" />;
      case "password":
        return <input type="password" value={String(v ?? "")} onChange={(e) => set(e.target.value)} className="input" minLength={8} autoComplete="new-password" />;
      default:
        return <input type={f.type === "email" ? "email" : "text"} value={String(v ?? "")} onChange={(e) => set(e.target.value)} className="input" required={f.required} />;
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="neu flex flex-wrap items-center gap-2 p-3">
        <label className="neu-inset flex min-w-[220px] flex-1 items-center gap-2 px-3">
          <Search size={15} className="text-muted" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={`Search ${r.title.toLowerCase()}…`}
            className="field-input py-2.5 text-[13px]"
          />
        </label>
        {filterFields.map((f) => (
          <select
            key={f.name}
            value={filter[f.name] ?? ""}
            onChange={(e) => {
              setFilter((x) => ({ ...x, [f.name]: e.target.value }));
              setPage(1);
            }}
            className="input !w-auto !py-2 text-[12.5px]"
            aria-label={f.label}
          >
            <option value="">{f.label}: all</option>
            {(f.type === "bool" ? [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] : f.type === "relation" ? options[f.name] ?? [] : f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        {!r.noCreate && (
          <button
            onClick={() => {
              setErr("");
              setEditing(emptyFor(r.fields));
            }}
            className="skeuo-btn flex items-center gap-1.5 px-4 py-2.5 text-[13px]"
          >
            <Plus size={15} /> New
          </button>
        )}
      </div>

      <div className="neu overflow-x-auto p-2">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted">
              {r.columns.map((c) => (
                <th key={c} className="px-3 py-2 font-bold">
                  {c === "createdAt" ? "Created" : fieldOf(c)?.label.replace(" (中文)", " · 中").replace(" (English)", " · EN").replace(/ \(.*\)$/, "") ?? c}
                </th>
              ))}
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={r.columns.length + 1} className="py-10 text-center text-muted">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={r.columns.length + 1} className="py-10 text-center text-muted">
                  No records
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/70 hover:bg-white/50">
                {r.columns.map((c) => (
                  <td key={c} className="px-3 py-2 align-middle">
                    {cell(row, c)}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button
                    onClick={() => {
                      setErr("");
                      setEditing({ ...row, password: "" });
                    }}
                    className="skeuo-icon-soft mr-1.5 inline-grid h-8 w-8"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(row)} className="skeuo-icon-soft inline-grid h-8 w-8 text-hot" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-[12.5px] text-muted">
        <span>
          {total} records · page {page}/{pages}
        </span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="skeuo-btn-light px-3 py-1.5 disabled:opacity-40">
            Prev
          </button>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="skeuo-btn-light px-3 py-1.5 disabled:opacity-40">
            Next
          </button>
        </div>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`${editing?.id ? "Edit" : "New"} ${r.title}`} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {r.fields.map((f) => (
            <label key={f.name} className={`flex flex-col gap-1 text-[12.5px] font-semibold ${f.half ? "" : "sm:col-span-2"}`}>
              <span>
                {f.label}
                {f.required && <span className="text-hot"> *</span>}
              </span>
              {input(f)}
              {f.help && <span className="text-[11px] font-normal text-muted">{f.help}</span>}
            </label>
          ))}
          {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-hot sm:col-span-2">{err}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setEditing(null)} className="skeuo-btn-light flex items-center gap-1 px-4 py-2.5 text-[13px]">
              <X size={14} /> Cancel
            </button>
            <button disabled={saving} className="skeuo-btn flex items-center gap-1 px-5 py-2.5 text-[13px]">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
            </button>
          </div>
        </form>
      </Modal>
      {toast && <div className="glass-dark fixed bottom-6 right-6 z-50 rounded-2xl px-4 py-3 text-[13px] font-semibold">{toast}</div>}
    </div>
  );
}
