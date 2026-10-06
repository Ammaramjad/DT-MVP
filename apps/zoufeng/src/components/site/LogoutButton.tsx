"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton({ label, endpoint = "/api/auth/logout", to = "/" }: { label: string; endpoint?: string; to?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch(endpoint, { method: "POST" });
        router.push(to);
        router.refresh();
      }}
      className="skeuo-btn-light flex items-center gap-1.5 px-4 py-2 text-[13px]"
    >
      <LogOut size={14} /> {label}
    </button>
  );
}
