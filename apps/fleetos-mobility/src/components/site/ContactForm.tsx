"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useState } from "react";
import type { Lang } from "@/lib/i18n";

const L = {
  name: { zh: "姓名", en: "Name" },
  email: { zh: "電子郵件", en: "Email" },
  phone: { zh: "電話", en: "Phone" },
  subject: { zh: "主旨", en: "Subject" },
  message: { zh: "訊息內容", en: "Message" },
  send: { zh: "送出訊息", en: "Send message" },
  sent: { zh: "已收到您的訊息，我們會盡快回覆！", en: "Message received — we'll get back to you soon!" },
};

export function ContactForm({ lang }: { lang: Lang }) {
  const tr = (k: keyof typeof L) => L[k][lang];
  const [f, setF] = useState({ name: "", email: "", phone: "", subject: "", body: "" });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  if (state === "done")
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-700">
        <CheckCircle2 /> {tr("sent")}
      </div>
    );
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setErr("");
        const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
        if (r.ok) setState("done");
        else {
          setErr((await r.json().catch(() => ({}))).error || "Error");
          setState("idle");
        }
      }}
    >
      <input required placeholder={`${tr("name")} *`} value={f.name} onChange={set("name")} className="input" />
      <input required type="email" placeholder={`${tr("email")} *`} value={f.email} onChange={set("email")} className="input" />
      <input placeholder={tr("phone")} value={f.phone} onChange={set("phone")} className="input" />
      <input placeholder={tr("subject")} value={f.subject} onChange={set("subject")} className="input" />
      <textarea required minLength={2} rows={4} placeholder={`${tr("message")} *`} value={f.body} onChange={set("body")} className="input resize-none sm:col-span-2" />
      {err && <p className="text-[12.5px] text-hot sm:col-span-2">{err}</p>}
      <button disabled={state === "busy"} className="skeuo-btn flex items-center justify-center gap-2 py-3 text-[14px] sm:col-span-2">
        {state === "busy" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {tr("send")}
      </button>
    </form>
  );
}
