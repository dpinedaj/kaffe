import type { BrewStep } from "./brew";

export interface TimedStep {
  s: number;
  step: BrewStep;
}

export interface BrewTimeline {
  /** Steps with no clock (“Prep”) — done before pressing start. */
  prep: BrewStep[];
  timed: TimedStep[];
  /** Steps after the clock (“Stop”, “Taste”, “Dilute”). */
  after: BrewStep[];
  totalS: number;
}

/** Seconds from a step label: "0:45", "~1:00", "8:00–10:00" (start), "45 s". Anything else is not on the clock. */
export function stepSeconds(at: string): number | null {
  const clean = at.trim().replace(/^~/, "");
  const clock = clean.match(/^(\d+):(\d{2})/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const secs = clean.match(/^(\d+)\s*s$/);
  if (secs) return Number(secs[1]);
  return null;
}

export function buildTimeline(steps: BrewStep[], totalS: number): BrewTimeline {
  const prep: BrewStep[] = [];
  const timed: TimedStep[] = [];
  const after: BrewStep[] = [];
  for (const step of steps) {
    const s = stepSeconds(step.at);
    if (s == null) (timed.length ? after : prep).push(step);
    else timed.push({ s, step });
  }
  timed.sort((a, b) => a.s - b.s);
  const lastAt = timed.length ? timed[timed.length - 1].s : 0;
  return { prep, timed, after, totalS: Math.max(totalS, lastAt) };
}

/** Index of the step running at `t` seconds (−1 before the first timed step). */
export function stepIndexAt(timeline: BrewTimeline, t: number): number {
  let idx = -1;
  for (let i = 0; i < timeline.timed.length; i++) {
    if (timeline.timed[i].s <= t) idx = i;
  }
  return idx;
}

export function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}
