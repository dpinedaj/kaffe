/** Clock label that never emits 0:60 — round to whole seconds first, then split. */
export function clockTick(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const NICE_STEPS_S = [15, 30, 60, 90, 120, 180, 240, 300, 600];

/** Keep ~1m labels from colliding: ~52px per tick at the SVG viewBox width. */
export const TIME_TICK_MIN_PX = 52;

export function niceTimeStep(maxT: number, maxTicks: number): number {
  const span = Math.max(60, maxT);
  const cap = Math.max(3, maxTicks);
  for (const step of NICE_STEPS_S) {
    if (Math.floor(span / step) + 1 <= cap) return step;
  }
  return NICE_STEPS_S[NICE_STEPS_S.length - 1];
}

/**
 * Evenly spaced X-axis times that fit the plot. Only nice steps, never past
 * maxT — a ragged 6:36 next to 6:30 is what made Nordic labels collide.
 */
export function timeTicks(maxT: number, plotWidthPx = 600): number[] {
  const max = Math.max(60, maxT);
  const maxTicks = Math.max(4, Math.floor(plotWidthPx / TIME_TICK_MIN_PX));
  const step = niceTimeStep(max, maxTicks);
  const out: number[] = [];
  for (let t = 0; t <= max + 1e-6; t += step) out.push(t);
  return out.length >= 2 ? out : [0, max];
}

export function timeTickAnchor(t: number, tMax: number): "start" | "middle" | "end" {
  if (tMax <= 0) return "middle";
  if (t <= tMax * 0.04) return "start";
  if (t >= tMax * 0.96) return "end";
  return "middle";
}

export const TEMP_TICKS = [40, 60, 80, 100, 120, 140, 160, 180, 200, 220];
export const ROR_TICKS = [-5, 0, 5, 10, 15, 20, 25, 30, 35];
export const FAN_RPM_MIN = 12000;
export const FAN_RPM_MAX = 16800;
export const FAN_TICKS = [12000, 13200, 14700, 16000];
