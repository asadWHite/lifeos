import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIFEOS — Your personal operating system",
  description:
    "Plan your days, sleep better, and move toward your goals — a personal system that adapts to you, not the other way around.",
  applicationName: "LIFEOS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#101513" },
  ],
};

/**
 * Applies the saved theme before first paint to avoid a flash.
 * Stored locally (appearance is not sensitive data).
 */
const themeScript = `(function(){try{var t=localStorage.getItem('lifeos-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`;

import { Intro } from "@/components/Branding";
import Script from "next/script";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg text-ink">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Intro />
        {children}
      </body>
    </html>
  );
}
