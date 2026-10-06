"use client";

import { Play, X } from "lucide-react";
import { useState } from "react";

export function VideoButton({ url, label }: { url: string; label: string }) {
  const [open, setOpen] = useState(false);
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)?.[1];
  return (
    <>
      <button onClick={() => setOpen(true)} className="group flex items-center gap-3 text-[14px] font-semibold text-ink">
        <span className="skeuo-icon h-12 w-12 transition-transform group-hover:scale-105" style={{ ["--c" as string]: "#2f6bff" }}>
          <Play size={18} fill="currentColor" />
        </span>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#0b1430]/70 p-4 backdrop-blur" onClick={() => setOpen(false)}>
          <div className="glass-strong relative w-full max-w-4xl overflow-hidden rounded-3xl p-2" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="neu-sm absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center" aria-label="Close">
              <X size={16} />
            </button>
            {yt ? (
              <iframe className="aspect-video w-full rounded-2xl" src={`https://www.youtube.com/embed/${yt}?autoplay=1`} allow="autoplay; encrypted-media" allowFullScreen />
            ) : (
              <video className="aspect-video w-full rounded-2xl bg-black" src={url} controls autoPlay />
            )}
          </div>
        </div>
      )}
    </>
  );
}
