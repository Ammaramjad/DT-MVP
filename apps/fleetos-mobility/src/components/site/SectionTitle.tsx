import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionTitle({ title, subtitle, href, more }: { title: string; subtitle?: string; href?: string; more?: string }) {
  return (
    <div className="mb-4 flex items-end gap-3">
      <div>
        <h2 className="text-[20px] font-black">{title}</h2>
        {subtitle && <p className="text-[12.5px] text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="ml-auto flex items-center gap-0.5 text-[13px] font-semibold text-brand hover:underline">
          {more} <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, image, children }: { title: string; subtitle?: string; image?: string; children?: React.ReactNode }) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-[32px] p-6 sm:p-10">
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-[#eef2f9] via-[#eef2f9]/85 to-[#eef2f9]/20" />
      <div className="relative max-w-2xl">
        <h1 className="text-[30px] font-black leading-tight sm:text-[38px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[14px] text-[#3b4669]">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
