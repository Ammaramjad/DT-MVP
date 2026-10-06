"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "zf_favs";

export function FavoriteButton({ id }: { id: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn((JSON.parse(localStorage.getItem(KEY) ?? "[]") as number[]).includes(id));
    } catch {}
  }, [id]);
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list: number[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    setOn(next.includes(id));
  };
  return (
    <button onClick={toggle} aria-label="Favorite" aria-pressed={on} className="glass grid h-8 w-8 place-items-center rounded-full">
      <Heart size={15} className={on ? "fill-hot text-hot" : "text-white"} />
    </button>
  );
}
