# LifeOS Lamp Behavior Specification

## State Machine

```
idle ──(≤15 min to fire)──► upcoming ──(fire time)──► active
  │                                                      │
  └──(no next fire)────────────────────────────────► missed
                                                         │
active ──(complete)──► completed (terminal)
active ──(snooze)───► snoozed ──(snoozeUntil reached)──► active
active ──(dismiss)──► missed (terminal)
snoozed ──(complete)──► completed (terminal)
snoozed ──(cancel snooze)──► idle
```

## Time Resolution

- Lamp checks schedule every **30 seconds** via `setInterval`
- Also rechecks on **Page Visibility** change (tab refocus)
- Current time (`Date.now()`) is compared against `scheduledAt` (or `snoozeUntil` when snoozed)
- Clock drift: Relies on `Date.now()` — no server clock correction. Acceptable for local-first app.

## Upcoming threshold

15 minutes before fire time → state transitions from `idle` to `upcoming`

## Snooze duration

10 minutes (configurable via `SNOOZE_MINUTES` constant in `Lamp.tsx`)

## Multiple scheduled goals

- Goals sorted by `scheduledAt` ascending
- Only the first non-completed goal is shown in the lamp scene at a time
- Completed/missed goals are filtered out on next reload

## Missed events

A goal is classified `missed` when `nextFireTime()` returns `null` (fire time passed with `repeat=once`) and state is still `idle`

## Repeat semantics

- `once`: fires on specified `scheduledAt` date+time, no recurrence
- `daily`: fires every day at the same HH:MM
- `weekdays`: fires Mon–Fri
- `weekends`: fires Sat–Sun
- `custom`: fires on `repeatDays[]` (0=Sun…6=Sat)

## Goal text

Goal title is always read from `Storage.getGoals()` at runtime. Never hardcoded.

## Browser limitations

When the browser tab is **closed**, JavaScript timers stop. The lamp will not fire while the app is closed. On next open, the app re-evaluates the schedule:
- If the time has passed → state becomes `missed`
- If still in the future → state remains `idle` / `upcoming`

True background delivery would require Web Push + a service worker + backend infrastructure. Not implemented in this release.
