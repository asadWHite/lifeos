import type { ReactNode } from "react";
import { PreviewShell } from "@/components/preview-shell";

/* Preview layout: no auth guard, no database. Bypasses the (app) group
 * entirely. Renders the real AppShell + navigation with a prominent
 * "Preview Mode" banner so users know nothing is saved. */
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return <PreviewShell>{children}</PreviewShell>;
}
