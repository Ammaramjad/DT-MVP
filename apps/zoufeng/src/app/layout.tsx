import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_TC({ weight: ["400", "500", "700", "900"], subsets: ["latin"], variable: "--font-noto", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "ZOUFENG 走瘋 | 台灣專業移動服務", template: "%s | ZOUFENG" },
  description: "機場接送・包車旅遊・城市接駁・企業用車 — Taiwan premium mobility platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={noto.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
