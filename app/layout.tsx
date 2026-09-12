import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI STRIDE | AIビルダーのウォーキングコミュニティ",
  description: "AIエンジニア・AIスタートアップ経営者限定。歩数を競い、歩いた記録を残し、地域やブランドとつながるコミュニティ。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
