"use client";

import { ImageIcon, Images, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Modal } from "./ui";

export interface MediaItem {
  id: number;
  filename: string;
  url: string;
  size: number;
}

export async function uploadFiles(files: FileList | File[]): Promise<MediaItem[]> {
  const fd = new FormData();
  Array.from(files).forEach((f) => fd.append("file", f));
  const r = await fetch("/api/admin/media", { method: "POST", body: fd });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Upload failed");
  return data;
}

export function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lib, setLib] = useState<MediaItem[] | null>(null);
  return (
    <div className="flex items-center gap-3">
      <div className="neu-inset grid h-16 w-24 shrink-0 place-items-center overflow-hidden">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={20} className="text-muted" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/media/1 or https://..." className="input !py-2 text-[12.5px]" />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="skeuo-btn-light flex items-center gap-1 px-3 py-1 text-[12px]">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload
          </button>
          <button
            type="button"
            onClick={async () => {
              const r = await fetch("/api/admin/media");
              setLib(r.ok ? await r.json() : []);
            }}
            className="skeuo-btn-light flex items-center gap-1 px-3 py-1 text-[12px]"
          >
            <Images size={13} /> Library
          </button>
          {err && <span className="text-[11.5px] text-hot">{err}</span>}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          if (!e.target.files?.length) return;
          setBusy(true);
          setErr("");
          try {
            const [m] = await uploadFiles(e.target.files);
            onChange(m.url);
          } catch (x) {
            setErr(x instanceof Error ? x.message : "Upload failed");
          }
          setBusy(false);
          e.target.value = "";
        }}
      />
      <Modal open={lib !== null} onClose={() => setLib(null)} title="Media library · 圖片庫" wide>
        {lib?.length === 0 && <p className="py-8 text-center text-muted">No uploads yet — use “Upload”.</p>}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {lib?.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => {
                onChange(m.url);
                setLib(null);
              }}
              className="neu-sm overflow-hidden text-left hover:ring-2 hover:ring-brand"
            >
              <img src={m.url} alt="" className="h-24 w-full object-cover" />
              <div className="truncate px-2 py-1 text-[11px]">{m.filename}</div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
