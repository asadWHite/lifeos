# LifeOS Feature Inventory

Last updated: 2025-07 (Complete rebuild)

| Feature | Status | Notes |
|---|---|---|
| Welcome page (multi-profile) | ✅ Working | Profile creation + profile select |
| Onboarding wizard | ✅ Working | 5-step, persists to localStorage |
| Today dashboard | ✅ Working | Greeting, lamp, tasks, goals, sleep |
| Lamp component (SVG) | ✅ Working | Real state machine, activates at scheduled time |
| Goal scheduling (lamp reminders) | ✅ Working | Time, repeat, duration, goalId linked |
| Lamp state machine | ✅ Working | idle→upcoming→active→snoozed/completed/missed |
| Complete/snooze/dismiss lamp | ✅ Working | State saved to localStorage |
| Sleep tracker (start/stop) | ✅ Working | Manual session, duration calculated |
| Sleep history with edit | ✅ Working | datetime-local correction, manual flag |
| Sleep bar chart (7-day) | ✅ Working | Color-coded green/yellow/red |
| Sleep status classification | ✅ Working | <2h=red, +30-90m=yellow, on-time=green |
| Task CRUD | ✅ Working | Create, edit title, toggle, delete |
| Task priorities | ✅ Working | Low/normal/high with color indicators |
| Overdue/today/upcoming grouping | ✅ Working | Date-based grouping in /plan |
| Habit tracking | ✅ Working | Daily check-in, streak calculation |
| Goal management | ✅ Working | Create, edit, archive, metric progress |
| Lamp reminder list | ✅ Working | /progress → Lamp tab |
| Progress page | ✅ Working | Active goals, completed, reminders |
| Profile page | ✅ Working | Name edit, theme, export, delete |
| Theme switching (light/dark) | ✅ Working | Saved to localStorage + CSS var |
| Data export (JSON) | ✅ Working | Full profile dump as file download |
| Navigation (5 tabs) | ✅ Working | Today/Sleep/Plan/Progress/Profile |
| Persistence across reloads | ✅ Working | localStorage-first storage |
| Telegram webhook stub | ⚠️ Partial | Handler exists, no bot token configured |
| Background notifications | ❌ Not implemented | Browser Notification API not wired |
| Multi-device sync | ❌ Not implemented | localStorage only — single device |
| AI assistant / Brain | ❌ Removed | Was broken; can be re-added when API key exists |
