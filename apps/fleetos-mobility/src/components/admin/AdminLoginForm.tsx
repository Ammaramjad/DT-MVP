"use client";

import { Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
        if (r.ok) {
          router.push(next && next.startsWith("/admin") ? next : "/admin");
          router.refresh();
        } else {
          setErr((await r.json().catch(() => ({}))).error || "Login failed");
          setBusy(false);
        }
      }}
    >
      <label className="neu-inset flex items-center gap-2 px-3">
        <Mail size={16} className="text-muted" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="field-input py-3" autoComplete="username" />
      </label>
      <label className="neu-inset flex items-center gap-2 px-3">
        <Lock size={16} className="text-muted" />
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="field-input py-3" autoComplete="current-password" />
      </label>
      {err && <p className="text-[12.5px] font-medium text-hot">{err}</p>}
      <button disabled={busy} className="skeuo-btn mt-1 flex items-center justify-center gap-2 py-3 text-[14px]">
        {busy && <Loader2 size={16} className="animate-spin" />} Sign in · 登入
      </button>
      {process.env.NODE_ENV !== "production" && (
        <button type="button" onClick={() => { setEmail("admin@fleetos.tw"); setPassword("admin12345"); }} className="text-[12px] text-muted underline">
          Dev account: admin@fleetos.tw / admin12345
        </button>
      )}
    </form>
  );
}
