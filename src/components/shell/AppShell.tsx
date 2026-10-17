"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun,      // Today
  Moon,     // Sleep
  CalendarDays, // Plan
  BarChart2, // Progress
  User,     // Profile
} from "lucide-react";

const NAV = [
  { href: "/today",    label: "Bugun",     icon: Sun         },
  { href: "/sleep",    label: "Uyqu",      icon: Moon        },
  { href: "/plan",     label: "Reja",      icon: CalendarDays},
  { href: "/progress", label: "Taraqqiyot",icon: BarChart2   },
  { href: "/profile",  label: "Profil",    icon: User        },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex flex-col">
      {/* page content */}
      <main className="flex-1 pb-nav">{children}</main>

      {/* bottom nav */}
      <nav className="bottom-nav" aria-label="Asosiy navigatsiya">
        <div className="flex items-center justify-around h-[56px] max-w-lg mx-auto px-2">
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 min-w-[52px] py-1 rounded-xl transition-colors ${
                  active
                    ? "text-[var(--c-ink)]"
                    : "text-[var(--c-ink2)] hover:text-[var(--c-ink)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${active ? "bg-[var(--c-surface2)]" : ""}`}>
                  <item.icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF633C]" />
                  )}
                </span>
                <span className={`text-label leading-none ${active ? "text-[var(--c-ink)]" : "text-[var(--c-ink2)]"}`} style={{ letterSpacing: "0.04em", fontSize: "9px" }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
