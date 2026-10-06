import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md pt-16 text-center">
      <div className="neu p-10">
        <div className="text-gradient text-[64px] font-black">404</div>
        <p className="text-muted">Page not found · 找不到頁面</p>
        <Link href="/" className="skeuo-btn mt-6 inline-block px-6 py-2.5">Home</Link>
      </div>
    </div>
  );
}
