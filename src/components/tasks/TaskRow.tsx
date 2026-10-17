"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, ChevronDown, ChevronUp, Clock, Flag } from "lucide-react";
import { Storage, generateId, todayDate, fmtDuration, type TaskRow } from "@/lib/client/storage";

const PRIORITY_COLORS: Record<string, string> = {
  high: "#C65B55",
  normal: "#C8943E",
  low: "#3F8065",
};

function relativeDate(dateStr: string | null, today: string): string {
  if (!dateStr) return "";
  if (dateStr === today) return "Bugun";
  const diff = Math.round((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
  if (diff === 1) return "Ertaga";
  if (diff === -1) return "Kecha";
  if (diff < -1) return `${-diff}k oldin`;
  if (diff > 1) return `${diff}k keyin`;
  return dateStr;
}

export function TaskRow({
  task,
  onChanged,
  goalTitle,
}: {
  task: TaskRow;
  onChanged: () => void;
  goalTitle?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const today = todayDate();

  function toggle() {
    const now = new Date().toISOString();
    Storage.saveTask({
      ...task,
      status: task.status === "done" ? "todo" : "done",
      completedAt: task.status === "done" ? null : now,
    });
    onChanged();
  }

  function saveEdit() {
    if (!editTitle.trim()) return;
    Storage.saveTask({ ...task, title: editTitle.trim() });
    setEditing(false);
    onChanged();
  }

  function remove() {
    Storage.deleteTask(task.id);
    onChanged();
  }

  const done = task.status === "done";
  const overdue = !done && task.dueDate && task.dueDate < today;

  if (editing) {
    return (
      <div className="px-4 py-3 flex gap-2 items-center bg-[var(--c-surface2)] rounded-xl">
        <input
          autoFocus
          className="input flex-1 py-2 text-sm"
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
        />
        <button className="btn btn-sm btn-primary" onClick={saveEdit}>Saqlash</button>
        <button className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>Bekor</button>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="px-4 py-3 flex gap-2 items-center justify-between">
        <p className="text-small text-[var(--c-ink2)]">O'chirilsinmi?</p>
        <div className="flex gap-2">
          <button className="btn btn-sm" onClick={remove} style={{ background: "#C65B55", color: "#fff" }}>O'chirish</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>Bekor</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 group rounded-xl transition-colors hover:bg-[var(--c-surface2)] ${done ? "opacity-50" : ""}`}>
      {/* checkbox */}
      <button
        onClick={toggle}
        aria-label={done ? "Bajarilmagan deb belgilash" : "Bajarildi deb belgilash"}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
          done ? "bg-[var(--c-ink)] border-[var(--c-ink)]" : "border-[var(--c-border)]"
        }`}
      >
        {done && <Check size={11} strokeWidth={3} className="text-[var(--c-bg)]" />}
      </button>

      {/* content */}
      <div className="flex-1 min-w-0">
        <p className={`text-body leading-snug ${done ? "line-through text-[var(--c-ink2)]" : ""}`}>
          {task.title}
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          {task.dueDate && (
            <span className={`text-label ${overdue ? "text-[#C65B55]" : "text-[var(--c-ink2)]"}`}>
              {relativeDate(task.dueDate, today)}
            </span>
          )}
          {task.durationMinutes && (
            <span className="text-label text-[var(--c-ink2)] flex items-center gap-0.5">
              <Clock size={10} /> {fmtDuration(task.durationMinutes)}
            </span>
          )}
          {task.priority !== "normal" && (
            <span className="text-label" style={{ color: PRIORITY_COLORS[task.priority] }}>
              <Flag size={10} className="inline mr-0.5" />{task.priority === "high" ? "Muhim" : "Oddiy"}
            </span>
          )}
          {goalTitle && (
            <span className="text-label text-[var(--c-ink2)] opacity-70">→ {goalTitle}</span>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => setEditing(true)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--c-surface2)] text-[var(--c-ink2)]">
          <Pencil size={13} />
        </button>
        <button onClick={() => setConfirmDelete(true)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--c-surface2)] text-[#C65B55]">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
