"use client";

import { Copy, Loader2, Star, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Lang } from "@/lib/i18n";

const L = {
  cancel: { zh: "取消預訂", en: "Cancel booking" },
  confirmCancel: { zh: "確定要取消此預訂嗎？", en: "Cancel this booking?" },
  review: { zh: "撰寫評價", en: "Write a review" },
  submit: { zh: "送出評價", en: "Submit review" },
  thanks: { zh: "感謝您的評價！審核後將會顯示。", en: "Thanks! Your review will appear after moderation." },
  copy: { zh: "複製代碼", en: "Copy code" },
  copied: { zh: "已複製", en: "Copied" },
  placeholder: { zh: "分享您的乘車體驗...", en: "Share your experience..." },
};

export function BookingActions({ lang, code, phone, canCancel, canReview }: { lang: Lang; code: string; phone: string; canCancel: boolean; canReview: boolean }) {
  const tr = (k: keyof typeof L) => L[k][lang];
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const post = async (path: string, body: object) => {
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/bookings/${code}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, ...body }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Error");
      return false;
    }
    return true;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="skeuo-btn-light flex items-center gap-1.5 px-4 py-2 text-[13px]"
        >
          <Copy size={14} /> {copied ? tr("copied") : tr("copy")}
        </button>
        {canCancel && (
          <button
            disabled={busy}
            onClick={async () => {
              if (!confirm(tr("confirmCancel"))) return;
              if (await post("cancel", {})) router.refresh();
            }}
            className="skeuo-btn-light skeuo-danger flex items-center gap-1.5 px-4 py-2 text-[13px]"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} {tr("cancel")}
          </button>
        )}
        {canReview && !reviewed && (
          <button onClick={() => setShowReview((s) => !s)} className="skeuo-btn flex items-center gap-1.5 px-4 py-2 text-[13px]">
            <Star size={14} /> {tr("review")}
          </button>
        )}
      </div>
      {showReview && !reviewed && (
        <form
          className="neu flex flex-col gap-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await post("review", { rating, content })) setReviewed(true);
          }}
        >
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star size={24} className={n <= rating ? "text-amber-400" : "text-slate-300"} fill="currentColor" />
              </button>
            ))}
          </div>
          <textarea required minLength={2} rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder={tr("placeholder")} className="input resize-none" />
          <button disabled={busy} className="skeuo-btn self-start px-5 py-2 text-[13px]">
            {tr("submit")}
          </button>
        </form>
      )}
      {reviewed && <p className="text-[13px] font-medium text-emerald-600">{tr("thanks")}</p>}
      {err && <p className="text-[13px] font-medium text-hot">{err}</p>}
    </div>
  );
}
