"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Lang } from "@/lib/i18n";

const L = {
  signIn: { zh: "會員登入", en: "Sign in" },
  register: { zh: "註冊會員", en: "Create account" },
  name: { zh: "姓名", en: "Name" },
  email: { zh: "電子郵件", en: "Email" },
  phone: { zh: "手機號碼", en: "Mobile" },
  password: { zh: "密碼", en: "Password" },
  noAccount: { zh: "還沒有帳號？立即註冊", en: "No account? Register" },
  haveAccount: { zh: "已有帳號？登入", en: "Have an account? Sign in" },
  demo: { zh: "示範帳號", en: "Demo account" },
};

export function AuthForm({ lang, mode, next }: { lang: Lang; mode: "login" | "register"; next?: string }) {
  const tr = (k: keyof typeof L) => L[k][lang];
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="neu flex flex-col gap-4 p-7"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
        if (res.ok) {
          router.push(next && next.startsWith("/") ? next : "/account");
          router.refresh();
        } else {
          setErr((await res.json().catch(() => ({}))).error || "Error");
          setBusy(false);
        }
      }}
    >
      <h1 className="text-[24px] font-black">{mode === "login" ? tr("signIn") : tr("register")}</h1>
      {mode === "register" && (
        <>
          <input required placeholder={tr("name")} value={f.name} onChange={set("name")} className="input" autoComplete="name" />
          <input placeholder={tr("phone")} value={f.phone} onChange={set("phone")} className="input" autoComplete="tel" />
        </>
      )}
      <input required type="email" placeholder={tr("email")} value={f.email} onChange={set("email")} className="input" autoComplete="email" />
      <input required type="password" minLength={mode === "register" ? 8 : 1} placeholder={tr("password")} value={f.password} onChange={set("password")} className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} />
      {err && <p className="text-[12.5px] font-medium text-hot">{err}</p>}
      <button disabled={busy} className="skeuo-btn flex items-center justify-center gap-2 py-3 text-[14px]">
        {busy && <Loader2 size={16} className="animate-spin" />}
        {mode === "login" ? tr("signIn") : tr("register")}
      </button>
      <Link href={mode === "login" ? "/register" : "/login"} className="text-center text-[13px] font-semibold text-brand">
        {mode === "login" ? tr("noAccount") : tr("haveAccount")}
      </Link>
      {mode === "login" && (
        <button type="button" onClick={() => setF((x) => ({ ...x, email: "demo@zoufeng.tw", password: "password123" }))} className="neu-inset px-3 py-2 text-[12px] text-muted">
          {tr("demo")}: demo@zoufeng.tw / password123
        </button>
      )}
    </form>
  );
}
