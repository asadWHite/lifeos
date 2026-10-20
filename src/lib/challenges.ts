import { diffDays, listDatesBetween, monthLength } from "@/lib/dates";

/* Challenge rules (explicit + deterministic):
 * - A day "counts" when at least one task was completed on that date
 *   (completedAt date in the user's timezone).
 * - ten_day   : starts on creation day, runs 10 consecutive days.
 * - monthly   : covers the user-selected calendar month (leap-year safe).
 * - Progress  : counted days / total days in the challenge window.
 * - Completion: every day from startDate to endDate counted. A challenge
 *   cannot complete early — it completes when the final day is counted.
 * - Failure   : a full day elapsed inside the window without any completion
 *   (for the current day's grace, the running day never fails a challenge).
 * - Historical: past windows evaluate deterministically from stored dates. */

export interface ChallengeLike {
  type: string;
  startDate: string;
  endDate: string;
  targetDays: number;
}

export interface ChallengeProgress {
  totalDays: number;
  countedDays: number;
  missedDays: string[];
  pct: number;
  state: "active" | "completed" | "failed";
  remainingToday: boolean; // whether today is inside the window
}

export function evaluateChallenge(
  challenge: ChallengeLike,
  countedDates: ReadonlySet<string>,
  today: string,
): ChallengeProgress {
  const all = listDatesBetween(challenge.startDate, challenge.endDate);
  const totalDays = all.length || challenge.targetDays;
  const elapsed = all.filter((d) => d <= today);

  let countedDays = 0;
  const missedDays: string[] = [];
  for (const d of elapsed) {
    if (countedDates.has(d)) countedDays++;
    else if (d < today) missedDays.push(d); // today is still in play
  }

  const remainingToday = today >= challenge.startDate && today <= challenge.endDate;

  let state: ChallengeProgress["state"];
  if (countedDays >= totalDays) state = "completed";
  else if (today > challenge.endDate || missedDays.length > 0) state = "failed";
  else state = "active";

  return {
    totalDays,
    countedDays,
    missedDays,
    pct: totalDays === 0 ? 0 : Math.round((countedDays / totalDays) * 100),
    state,
    remainingToday,
  };
}

/** start..end and targetDays for a new challenge. Leap-year safe. */
export function challengeWindow(
  spec: { type: "ten_day" } | { type: "monthly"; month: number; year: number },
  today: string,
): { startDate: string; endDate: string; targetDays: number } {
  if (spec.type === "ten_day") {
    const end = new Date(`${today}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 9);
    return { startDate: today, endDate: end.toISOString().slice(0, 10), targetDays: 10 };
  }
  const { month, year } = spec;
  const len = monthLength(year, month);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(len).padStart(2, "0")}`;
  return { startDate, endDate, targetDays: diffDays(startDate, endDate) + 1 };
}
