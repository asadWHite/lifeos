"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  Target,
  Zap,
  Moon,
  Settings,
  Plus
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Branding";

const NAV = [
  { href: "/home", label: "Dashboard", icon: Home },
  { href: "/plan", label: "Reja", icon: ClipboardList },
  { href: "/goals", label: "Maqsad", icon: Target },
  { href: "/habits", label: "Odatlar", icon: Zap },
  { href: "/sleep", label: "Uyqu", icon: Moon },
];

export function AppShell({
  name,
  goals,
  children,
}: {
  name: string;
  goals: any[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-bg/80 backdrop-blur-xl border-b border-border tma-safe-top">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.2em]">LifeOS</span>
          <h1 className="text-lg font-bold text-ink truncate max-w-[200px]">{name}</h1>
        </div>
        <Link href="/settings" className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors">
          <Settings size={20} />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-2xl border-t border-border px-2 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center py-2"
              >
                <div className={`relative z-10 p-2 rounded-xl transition-all duration-300 ${active ? 'text-brand-light' : 'text-ink-muted hover:text-ink'}`}>
                  {active && (
                    <motion.div 
                      layoutId="nav-bg"
                      className="absolute inset-0 bg-brand-dark rounded-xl -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] mt-1 font-bold tracking-tight transition-colors ${active ? 'text-brand-dark' : 'text-ink-muted'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Fast Action Button - could be added if needed */}
    </div>
  );
}
