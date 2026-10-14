"use client";

import { useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { TaskRow, type TaskView } from "@/components/tasks/TaskRow";
import { InlineTaskAdd } from "@/components/tasks/InlineTaskAdd";
import { EmptyState } from "@/components/ui";

export function TodayPanel({
  openTasks,
  completedTasks,
  todayIso,
  goalTitles,
}: {
  openTasks: TaskView[];
  completedTasks: TaskView[];
  todayIso: string;
  goalTitles: Record<string, string>;
}) {
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div>
      {openTasks.length === 0 ? (
        <div className="pb-2">
          <EmptyState
            icon={<ClipboardList size={20} strokeWidth={1.8} />}
            title={completedTasks.length > 0 ? "All done for today" : "Your day is clear"}
            body={
              completedTasks.length > 0
                ? "Everything on today's list is complete. Nice work — add anything else that comes up."
                : "Add one or two things that would make today count."
            }
            compact
          />
        </div>
      ) : (
        <div className="divide-y divide-line">
          {openTasks.map((t) => (
            <TaskRow key={t.id} task={t} todayIso={todayIso} goalTitle={t.goalId ? goalTitles[t.goalId] : null} />
          ))}
        </div>
      )}

      <div className="pt-3">
        <InlineTaskAdd dueDate={todayIso} />
      </div>

      {completedTasks.length > 0 && (
        <div className="pt-3">
          <button
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink3 transition-colors hover:text-ink2"
            onClick={() => setShowCompleted((v) => !v)}
            aria-expanded={showCompleted}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showCompleted ? "" : "-rotate-90"}`}
            />
            Completed today ({completedTasks.length})
          </button>
          {showCompleted && (
            <div className="divide-y divide-line animate-fade">
              {completedTasks.map((t) => (
                <TaskRow key={t.id} task={t} todayIso={todayIso} goalTitle={t.goalId ? goalTitles[t.goalId] : null} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
