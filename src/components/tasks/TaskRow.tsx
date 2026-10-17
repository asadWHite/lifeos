"use client";
import { useState } from "react";
import { Check, Pencil, Trash2, Flag } from "lucide-react";
import { Storage, todayDate, type TaskRow } from "@/lib/client/storage";

export function TaskRow({ task, onChanged, goalTitle }: {
  task: TaskRow; onChanged: () => void; goalTitle?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [confirm, setConfirm] = useState(false);
  const today = todayDate();

  function toggle() {
    const done = task.status !== "done";
    Storage.saveTask({ ...task, status: done ? "done" : "todo", completedAt: done ? new Date().toISOString() : null });
    if (done) Storage.checkAndUnlockAchievements(task.profileId);
    onChanged();
  }
  function saveEdit() {
    if (!editTitle.trim()) return;
    Storage.saveTask({ ...task, title: editTitle.trim() });
    setEditing(false); onChanged();
  }
  function remove() { Storage.deleteTask(task.id); onChanged(); }

  const done = task.status === "done";
  const overdue = !done && task.dueDate && task.dueDate < today;

  if (confirm) return (
    <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span className="t-sm" style={{ color: "var(--error)" }}>O'chirilsinmi?</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={remove} className="btn btn-sm" style={{ background: "var(--error)", color: "#fff" }}>O'chirish</button>
        <button onClick={() => setConfirm(false)} className="btn btn-ghost btn-sm">Bekor</button>
      </div>
    </div>
  );

  if (editing) return (
    <div style={{ padding: "10px 16px", display: "flex", gap: 8, alignItems: "center" }}>
      <input className="input flex-1" style={{ padding: "8px 12px" }} value={editTitle}
        onChange={e => setEditTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }} autoFocus />
      <button className="btn btn-primary btn-sm" onClick={saveEdit}>Saqla</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Bekor</button>
    </div>
  );

  return (
    <div className="group" style={{
      display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px",
      borderRadius: 12, transition: "background 0.12s",
      opacity: done ? 0.55 : 1,
    }}>
      <button onClick={toggle} aria-label={done ? "Bajarilmagan" : "Bajarildi"} style={{
        width: 22, height: 22, borderRadius: "50%", border: `2px solid ${done ? "var(--success)" : overdue ? "var(--error)" : "var(--border)"}`,
        background: done ? "var(--success)" : "transparent", flexShrink: 0, marginTop: 1,
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
      }}>
        {done && <Check size={12} strokeWidth={3} color="#fff" />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.9rem", fontWeight: 500, textDecoration: done ? "line-through" : "none", wordBreak: "break-word" }}>
          {task.isPriority && !done && <Flag size={11} style={{ display: "inline", color: "var(--lamp-orange)", marginRight: 4 }} />}
          {task.title}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
          {task.dueDate && <span className="t-xs" style={{ color: overdue ? "var(--error)" : "var(--ink2)" }}>{task.dueDate}</span>}
          {task.priority === "high" && !done && <span className="t-xs" style={{ color: "var(--error)" }}>Muhim</span>}
          {goalTitle && <span className="t-xs" style={{ color: "var(--ink2)" }}>→ {goalTitle}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, opacity: 0, transition: "opacity 0.15s" }} className="group-hover-show">
        <button onClick={() => setEditing(true)} className="btn-icon" style={{ width: 30, height: 30 }}><Pencil size={13} /></button>
        <button onClick={() => setConfirm(true)} className="btn-icon" style={{ width: 30, height: 30, color: "var(--error)" }}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
