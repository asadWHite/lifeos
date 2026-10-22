"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2, Eye, MoonStar, TrendingUp, UserRound, Waves } from "lucide-react";
import { ToastProvider, cn } from "@/components/ui";

const NAV = [
  { href: "/preview/today", label: "Today", icon: Waves },
  { href: "/preview/sleep", label: "Sleep", icon: MoonStar },
  { href: "/preview/plan", label: "Plan", icon: CalendarCheck2 },
  { href: "/preview/progress", label: "Progress", icon: TrendingUp },
  { href: "/preview/profile", label: "Profile", icon: UserRound },
] as const;

function BrandMark() {
  return (
    <Link href="/preview/today" className="flex items-center gap-2.5" aria-label="LifeOS home">
      <span className="relative grid size-9 place-items-center rounded-xl bg-accent/15 text-accent">
        <Waves className="size-5" aria-hidden />
      </span>
      <span className="hidden sm:block">
        <span className="block font-display text-[17px] font-semibold leading-none">LifeOS</span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">TimeFlow</span>
      </span>
    </Link>
  );
}

export function PreviewShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      {/* Preview Mode banner — always visible, never dismissable */}
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-accent/90 px-4 py-2 text-center text-sm font-semibold text-white backdrop-blur-sm">
        <Eye className="size-4" aria-hidden />
        Preview Mode — design inspection only, nothing is saved
        <Link href="/sign-in" className="ml-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold hover:bg-white/30 transition-colors">
          Sign in for real →
        </Link>
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col pt-10 lg:flex-row lg:gap-8 lg:px-8">
        {/* Desktop rail */}
        <header className="sticky top-10 z-40 flex items-center justify-between gap-4 px-4 py-3 backdrop-blur-xl sm:px-6 lg:sticky lg:top-10 lg:h-[calc(100dvh-2.5rem)] lg:w-56 lg:flex-col lg:items-stretch lg:justify-start lg:gap-8 lg:px-0 lg:py-8 lg:backdrop-blur-none">
          <BrandMark />
          <nav aria-label="Primary" className="max-lg:hidden">
            <ul className="grid gap-1.5">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-150",
                        active ? "glass text-ink shadow-[var(--shadow-pop)]" : "text-sub hover:bg-[var(--c-line)] hover:text-ink",
                      )}
                    >
                      <Icon className={cn("size-[18px]", active && "text-accent")} aria-hidden />
                      {label}
                      {active && <span className="ml-auto size-1.5 rounded-full bg-accent" aria-hidden />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <main className="w-full min-w-0 flex-1 px-4 pb-28 pt-2 sm:px-6 lg:px-0 lg:pb-12 lg:pt-8">
          <div key={pathname} className="animate-page">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav aria-label="Primary" className="glass-strong fixed inset-x-3 bottom-3 z-40 rounded-3xl lg:hidden">
          <ul className="grid grid-cols-5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-colors",
                      active ? "text-accent" : "text-sub hover:text-ink",
                    )}
                  >
                    <span className={cn("grid size-8 place-items-center rounded-full transition-colors", active && "bg-accent/12")}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </ToastProvider>
  );
}
