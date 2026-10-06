"use client";

import { Copy, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { uploadFiles, type MediaItem } from "./ImageField";

export function MediaLibrary({ initial }: { initial: MediaItem[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const up = async (files: FileList | File[]) => {
    setBusy(true);
    setErr("");
    try {
      const added = await uploadFiles(files);
      setItems((x) => [...added, ...x]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    }
    setBusy(false);
  };
  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) up(e.dataTransfer.files); }}
        className={`neu-inset flex flex-col items-center gap-3 p-10 text-center ${drag ? "ring-2 ring-brand" : ""}`}
      >
        <span className="skeuo-icon h-14 w-14" style={{ ["--c" as string]: "#2f6bff" }}>{busy ? <Loader2 className="animate-spin" /> : <Upload />}</span>
        <p className="text-[13.5px]">Drag & drop images here, or</p>
        <button onClick={() => input.current?.click()} className="skeuo-btn px-5 py-2 text-[13px]">Choose files</button>
        <p className="text-[11.5px] text-muted">PNG, JPG, WEBP, GIF, SVG, AVIF · up to 4 MB each</p>
        {err && <p className="text-[12.5px] text-hot">{err}</p>}
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files?.length) up(e.target.files); e.target.value = ""; }} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((m) => (
          <figure key={m.id} className="neu overflow-hidden">
            <img src={m.url} alt="" className="h-32 w-full object-cover" />
            <figcaption className="flex items-center gap-1 p-2 text-[11.5px]">
              <span className="min-w-0 flex-1 truncate" title={m.filename}>{m.filename}<br /><span className="text-muted">{m.url} · {(m.size / 1024).toFixed(0)} KB</span></span>
              <button onClick={() => navigator.clipboard?.writeText(m.url)} className="skeuo-icon-soft h-7 w-7" aria-label="Copy URL"><Copy size={12} /></button>
              <button
                onClick={async () => {
                  if (!confirm("Delete this image? Pages using it will show a broken image.")) return;
                  const r = await fetch(`/api/admin/media/${m.id}`, { method: "DELETE" });
                  if (r.ok) setItems((x) => x.filter((y) => y.id !== m.id));
                }}
                className="skeuo-icon-soft h-7 w-7 text-hot"
                aria-label="Delete"
              >
                <Trash2 size={12} />
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
      {items.length === 0 && <p className="text-center text-muted">No images uploaded yet.</p>}
    </div>
  );
}
