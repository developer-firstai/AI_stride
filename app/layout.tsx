import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI STRIDE | AIビルダーの月間ウォーキングリーグ",
  description: "AIエンジニア・AIスタートアップ経営者限定。毎日の歩数を記録して、月間ランキングに参加しよう。",
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
