import { Cloud, CloudLightning, CloudRain, CloudSun, Sun } from "lucide-react";

export function WeatherIcon({ icon, size = 34 }: { icon: string; size?: number }) {
  const cls = "drop-shadow-[0_4px_8px_rgba(245,158,11,0.45)]";
  if (icon === "sun") return <Sun size={size} className={`${cls} text-amber-400`} fill="#fbbf24" />;
  if (icon === "cloud") return <Cloud size={size} className="text-slate-400" fill="#e2e8f0" />;
  if (icon === "rain") return <CloudRain size={size} className="text-sky-500" />;
  if (icon === "storm") return <CloudLightning size={size} className="text-indigo-500" />;
  return <CloudSun size={size} className={`${cls} text-amber-400`} />;
}
