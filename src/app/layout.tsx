import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";
import "./theme.css";

export const metadata: Metadata = { title: "HNova Muse", description: "Personal Music Library & Interactive Learning" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><Shell>{children}</Shell></body></html>;
}
