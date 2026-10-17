"use client";
import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, CalendarDays, BarChart2, User } from "lucide-react";

const NAV = [
  { href: "/today",    label: "Bugun",     Icon: Sun          },
  { href: "/sleep",    label: "Uyqu",      Icon: Moon         },
  { href: "/plan",     label: "Reja",      Icon: CalendarDays },
  { href: "/progress", label: "Taraqqiyot",Icon: BarChart2    },
  { href: "/profile",  label: "Profil",    Icon: User         },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <main style={{ flex: 1 }}>{children}</main>

      {/* Liquid Glass Bottom Nav */}
      <nav
        className="glass-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        aria-label="Asosiy navigatsiya"
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", maxWidth: 520, margin: "0 auto" }}>
          {NAV.map(({ href, label, Icon }) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 3, padding: "10px 4px 10px", textDecoration: "none", position: "relative",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Active pill */}
                {active && (
                  <div style={{
                    position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                    width: 32, height: 32, borderRadius: 10,
                    background: "var(--lamp-orange)", opacity: 0.15,
                  }} />
                )}
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{
                    color: active ? "var(--lamp-orange)" : "var(--ink2)",
                    position: "relative", zIndex: 1,
                    transition: "color 0.2s",
                  }}
                />
                <span style={{
                  fontSize: "0.6rem", fontWeight: active ? 700 : 500, letterSpacing: "0.04em",
                  color: active ? "var(--lamp-orange)" : "var(--ink2)",
                  transition: "color 0.2s",
                }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
