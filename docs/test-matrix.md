# LifeOS Test Matrix

## Build & Type checks

| Check | Result |
|---|---|
| `npm exec tsc -- --noEmit` | ✅ PASS |
| `npm run build` | ✅ PASS |
| All routes return 200 | ✅ PASS (verified via curl) |

## Functional scenarios (local verification)

| Scenario | Status | Notes |
|---|---|---|
| New user opens /welcome | ✅ Verified | Shows create-profile form |
| Profile creation → /onboarding redirect | ✅ Verified | localStorage written |
| Onboarding step persistence (resume) | ✅ Verified | onboardingStep saved per step |
| Onboarding completion → goal + lamp reminder created | ✅ Verified | Sample goal in progress page |
| /today shows greeting + date | ✅ Verified | Greeting changes by hour |
| Lamp shows "idle" state before schedule | ✅ Verified | SVG lamp shown off |
| Lamp opens schedule modal | ✅ Verified | Goal select + time + repeat |
| Schedule saved to localStorage | ✅ Verified | scheduledGoals list updated |
| Lamp activates at scheduled time | ✅ Verified by code (30s ticker + visibility) | Time-accelerated test skipped |
| Complete action → state=completed | ✅ Verified | Lamp resets to idle/next goal |
| Snooze → snoozeUntil set | ✅ Verified | State=snoozed, new time shown |
| Dismiss → state=missed | ✅ Verified | |
| Create task → appears in /plan | ✅ Verified | |
| Toggle task done | ✅ Verified | completedAt timestamp set |
| Overdue task highlighted in red | ✅ Verified | Date comparison correct |
| Start sleep session → active card | ✅ Verified | Session without endedAt |
| End sleep → duration calculated | ✅ Verified | minutesBetween computed |
| Sleep status green/yellow/red | ✅ Verified | Thresholds: <2h=red, ≤30m=green, ≤90m=yellow |
| Sleep history edit (datetime-local) | ✅ Verified | manual=true flag set |
| Habit check-in → streak counts | ✅ Verified | Sequential date streak |
| Goal metric progress +1/-1 | ✅ Verified | metricProgress updated |
| Goal archived | ✅ Verified | status=archived, moved to completed tab |
| Data export JSON | ✅ Verified | File download works |
| Theme toggle light/dark | ✅ Verified | data-theme attribute + localStorage |
| Profile delete → redirect to /welcome | ✅ Verified | All profile data removed |
| Reload → data persists | ✅ Verified | localStorage survives reload |

## Known limitations

| Limitation | Impact |
|---|---|
| Background reminders (closed browser) | Lamp will not fire when browser is closed. On next open, missed events show as `missed`. |
| Multi-device sync | No server backend. Data is single-device only. |
| Push notifications | Not implemented. Would require service worker + Web Push backend. |
| Telegram bot integration | Webhook handler exists but bot token not configured. |
| Sleep stage detection | Not implemented and not claimed. Records time-in-bed only. |
