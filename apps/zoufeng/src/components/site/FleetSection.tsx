"use client";

import { ChevronLeft, ChevronRight, Luggage, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import clsx from "clsx";

export interface FleetVehicle {
  id: number;
  typeId: number | null;
  name: string;
  model: string;
  image: string;
  minPax: number;
  maxPax: number;
  luggage: number;
  price: string;
}

export function FleetSection({
  title,
  subtitle,
  allLabel,
  types,
  vehicles,
  labels,
}: {
  title: string;
  subtitle: string;
  allLabel: string;
  types: { id: number; name: string }[];
  vehicles: FleetVehicle[];
  labels: { from: string; people: string; bags: string; book: string };
}) {
  const [type, setType] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const list = type == null ? vehicles : vehicles.filter((v) => v.typeId === type);
  const scroll = (dir: number) => scroller.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  return (
    <section className="neu min-w-0 p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-[20px] font-black">{title}</h2>
          <p className="text-[12.5px] text-muted">{subtitle}</p>
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto md:ml-auto">
          {[{ id: null as number | null, name: allLabel }, ...types].map((t) => (
            <button
              key={String(t.id)}
              onClick={() => setType(t.id)}
              className={clsx(
                "whitespace-nowrap rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition",
                type === t.id ? "skeuo-btn" : "neu-sm !rounded-full text-[#3b4669] hover:text-brand",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="hidden gap-2 md:flex">
          <button onClick={() => scroll(-1)} aria-label="Previous" className="skeuo-btn-light grid h-9 w-9 place-items-center !rounded-full">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll(1)} aria-label="Next" className="skeuo-btn-light grid h-9 w-9 place-items-center !rounded-full">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div ref={scroller} className="no-scrollbar -mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-3 pt-1">
        {list.map((v) => (
          <Link
            href={`/fleet#v-${v.id}`}
            key={v.id}
            className="neu-press group flex w-[200px] shrink-0 snap-start flex-col rounded-3xl bg-gradient-to-b from-white to-[#eef2f9] p-4 shadow-[6px_6px_16px_rgba(163,177,205,0.45),-6px_-6px_16px_#fff]"
          >
            <div className="relative grid h-[110px] place-items-center">
              <div className="absolute bottom-1 h-4 w-3/4 rounded-[50%] bg-[#1b2440]/15 blur-md" />
              <img src={v.image} alt={v.name} className="relative max-h-[105px] w-auto object-contain transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            </div>
            <div className="mt-2 text-[15px] font-bold">{v.name}</div>
            <div className="text-[11.5px] text-muted">{v.model}</div>
            <div className="mt-2 flex items-center gap-3 text-[12px] text-[#3b4669]">
              <span className="flex items-center gap-1">
                <UsersRound size={13} /> {v.minPax === v.maxPax ? v.maxPax : `${v.minPax}-${v.maxPax}`} {labels.people}
              </span>
              <span className="flex items-center gap-1">
                <Luggage size={13} /> {v.luggage} {labels.bags}
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-[11px] text-muted">{labels.from}</span>
              <span className="text-[16px] font-black text-brand">{v.price}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
