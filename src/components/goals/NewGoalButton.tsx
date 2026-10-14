"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { GoalSheet } from "@/components/goals/GoalSheet";

export function NewGoalButton({
  primary = true,
  size = "md",
  label,
}: {
  primary?: boolean;
  size?: "md" | "lg";
  label?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={`btn ${primary ? "btn-primary" : "btn-secondary"} ${size === "lg" ? "btn-lg" : ""} shrink-0`}
        onClick={() => setOpen(true)}
      >
        {label ?? (
          <>
            <Plus size={16} />
            <span className="hidden sm:inline">New goal</span>
            <span className="sm:hidden">Goal</span>
          </>
        )}
      </button>
      <GoalSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
