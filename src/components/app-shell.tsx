"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2, MoonStar, TrendingUp, UserRound, Waves } from "lucide-react";
import { ToastProvider, cn } from "@/components/ui";
import { ReminderWatcher } from "@/components/reminder-watcher";

const NAV = [
  { href: "/today", label: "Today", icon: Waves },
  { href: "/sleep", label: "Sleep", icon: MoonStar },
  { href: "/plan", label: "Plan", icon: CalendarCheck2 },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export interface ShellUser {
  name: string;
  nickname: string | null;
  timezone: string;
  remindersEnabled: boolean;
  reminderStyle: string;
}

function BrandMark() {
  return (
    <Link href="/today" className="flex items-center gap-2.5" aria-label="LifeOS home">
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

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col lg:flex-row lg:gap-8 lg:px-8">
        {/* Desktop / tablet rail */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-3 backdrop-blur-xl sm:px-6 lg:sticky lg:top-0 lg:h-dvh lg:w-56 lg:flex-col lg:items-stretch lg:justify-start lg:gap-8 lg:px-0 lg:py-8 lg:backdrop-blur-none">
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
          {/* Mobile top bar only shows brand; nav lives at the bottom */}
        </header>

        <main className="w-full min-w-0 flex-1 px-4 pb-28 pt-2 sm:px-6 lg:px-0 lg:pb-12 lg:pt-8">
          <div key={pathname} className="animate-page">
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation (Liquid Glass) */}
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

      <ReminderWatcher
        timezone={user.timezone}
        enabled={user.remindersEnabled}
        style={user.reminderStyle}
      />
    </ToastProvider>
  );
}
