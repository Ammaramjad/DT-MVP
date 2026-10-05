export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="zf-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#21d4a8" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="zf-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#19c3e6" />
        </linearGradient>
      </defs>
      <path d="M6 6h30l-8 9H6z" fill="url(#zf-a)" />
      <path d="M36 6 12 42H4L28 6z" fill="url(#zf-b)" opacity=".95" />
      <path d="M20 33h24l-6 9H14z" fill="#16a34a" opacity=".9" />
    </svg>
  );
}

export function Logo({ name, tagline, logo }: { name: string; tagline: string; logo?: string }) {
  return (
    <span className="flex items-center gap-2">
      {logo ? <img src={logo} alt={name} className="h-11 w-11 object-contain" /> : <LogoMark />}
      <span className="leading-tight">
        <span className="block text-[22px] font-black tracking-tight text-[#14204a]">{name}</span>
        <span className="block text-[11px] font-medium tracking-wide text-[#3b4669]">{tagline}</span>
      </span>
    </span>
  );
}
