"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
  HeartPulse,
  House,
  Plus,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";
import { Logo, Wordmark } from "@/components/Logo";
import { TaskSheet, type GoalOption } from "@/components/tasks/TaskSheet";

const NAV = [
  { href: "/home", label: "Home", icon: House },
  { href: "/brain", label: "Brain", icon: Sparkles },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/progress", label: "Progress", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({
  name,
  goals,
  children,
}: {
  name: string;
  goals: GoalOption[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);
  const firstName = name.split(" ")[0];

  return (
    <div className="min-h-dvh bg-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <Logo size={30} />
          <Wordmark />
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="nav-item" data-active={active}>
                <item.icon size={18} strokeWidth={active ? 2.1 : 1.8} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-6">
          <button className="btn btn-primary w-full" onClick={() => setQuickOpen(true)}>
            <Plus size={16} />
            New task
          </button>
          <p className="mt-4 truncate px-2 text-[12.5px] font-medium text-ink3">
            {firstName}&rsquo;s space
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <Link href="/home" className="flex items-center gap-2" aria-label="LIFEOS home">
          <Logo size={26} />
          <Wordmark size={15} />
        </Link>
        <span className="text-[12.5px] font-medium text-ink3">{firstName}</span>
      </header>

      {/* Content */}
      <div className="md:pl-60">
        <main className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-6 sm:px-6 md:pb-14 md:pt-9 lg:px-10">
          {children}
        </main>
      </div>

      {/* Mobile quick-add FAB */}
      <button
        className="fixed bottom-[76px] right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-accent text-white shadow-raised transition-transform active:scale-95 md:hidden"
        style={{ height: 52, width: 52 }}
        onClick={() => setQuickOpen(true)}
        aria-label="Create a new task"
      >
        <Plus size={22} />
      </button>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-6">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                  active ? "text-accent-ink" : "text-ink3"
                }`}
              >
                <item.icon size={20} strokeWidth={active ? 2.1 : 1.8} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <TaskSheet open={quickOpen} onClose={() => setQuickOpen(false)} goals={goals} />
    </div>
  );
}
