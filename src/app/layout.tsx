import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: { default: "LifeOS — TimeFlow", template: "%s · LifeOS" },
  description: "LifeOS is your personal operating system: plan your day on the TimeFlow timeline, track sleep, build habits, and reach goals.",
};

export const viewport: Viewport = {
  themeColor: "#151B23",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const theme = jar.get("lifeos_theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="en" data-theme={theme} className={`${inter.variable} ${fraunces.variable}`}>
      <body className="bg-app text-ink antialiased">{children}</body>
    </html>
  );
}
