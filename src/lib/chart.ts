export function clockTick(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function timeTicks(maxT: number): number[] {
  const step = maxT > 420 ? 60 : 30;
  const out: number[] = [];
  for (let t = 0; t <= maxT + 0.01; t += step) out.push(t);
  if (out[out.length - 1] < maxT - 5) out.push(Math.round(maxT));
  return out;
}

export const TEMP_TICKS = [40, 60, 80, 100, 120, 140, 160, 180, 200, 220];
export const ROR_TICKS = [-5, 0, 5, 10, 15, 20, 25, 30, 35];
