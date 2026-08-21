import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./upload.css";
import "./settings.css";
import "./pipeline.css";
import "./math.css";
import "./theme.css";
import "./diary-theme.css";
import "./responsive.css";
import "./knowledge-tree.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "悟道 · 个人学习机",
  description: "把你的学习资料变成可以长期记住的知识卡片。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "悟道 · 个人学习机", description: "把知识变成长久记忆", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "悟道 · 个人学习机", description: "把知识变成长久记忆", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
