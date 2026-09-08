import type { BezierSegment, CurveData, Point } from "./kpro";

export const MIN_ANCHOR_GAP = 8;

function clampTemp(v: number): number {
  return Math.max(25, Math.min(228, v));
}

export function rebuildFromAnchors(anchors: Point[]): CurveData {
  const segs: BezierSegment[] = [];
  for (let i = 0; i + 1 < anchors.length; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    segs.push({
      start: a,
      cp1: { t: a.t + (b.t - a.t) * 0.35, v: a.v + (b.v - a.v) * 0.35 },
      cp2: { t: a.t + (b.t - a.t) * 0.7, v: a.v + (b.v - a.v) * 0.7 },
      end: b,
    });
  }
  return { anchors, segments: segs };
}

export function insertAnchor(anchors: Point[], at: Point): Point[] {
  if (anchors.length === 0) return [{ t: Math.max(1, at.t), v: clampTemp(at.v) }];
  const t = Math.max(1, at.t);
  const v = clampTemp(at.v);
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (anchors.length >= 2 && (t <= first.t + MIN_ANCHOR_GAP || t >= last.t - MIN_ANCHOR_GAP)) return anchors;
  let i = anchors.findIndex((p) => p.t > t);
  if (i < 0) i = anchors.length;
  const prev = anchors[i - 1];
  const next = anchors[i];
  if (prev && t - prev.t < MIN_ANCHOR_GAP) return anchors;
  if (next && next.t - t < MIN_ANCHOR_GAP) return anchors;
  const copy = [...anchors];
  copy.splice(i, 0, { t, v });
  return copy;
}

export function deleteAnchor(anchors: Point[], index: number): Point[] {
  if (anchors.length <= 3) return anchors;
  if (index <= 0 || index >= anchors.length - 1) return anchors;
  return anchors.filter((_, i) => i !== index);
}

/**
 * Ease a spike or sharp corner back toward its neighbors. Leaves a normal
 * rising roast alone — global Laplacian smoothing flattened the curve toward
 * the start–end chord (the “Y = X” look).
 */
export function smoothAnchors(anchors: Point[], passes = 2): Point[] {
  if (anchors.length < 3) return anchors.map((p) => ({ t: p.t, v: p.v }));
  let pts = anchors.map((p) => ({ t: p.t, v: p.v }));
  const first = { ...pts[0] };
  const last = { ...pts[pts.length - 1] };

  for (let pass = 0; pass < passes; pass++) {
    const kinks: number[] = [];
    for (let i = 1; i < pts.length - 1; i++) {
      kinks.push(Math.abs(slopeDelta(pts[i - 1], pts[i], pts[i + 1])));
    }
    const sorted = [...kinks].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const kinkFloor = Math.max(0.22, median * 2.8);

    pts = pts.map((p, i) => {
      if (i === 0 || i === pts.length - 1) return p;
      const a = pts[i - 1];
      const b = pts[i + 1];
      const dt1 = Math.max(1e-6, p.t - a.t);
      const dt2 = Math.max(1e-6, b.t - p.t);
      const sIn = (p.v - a.v) / dt1;
      const sOut = (b.v - p.v) / dt2;
      const span = Math.max(1e-6, b.t - a.t);
      const chord = a.v + ((p.t - a.t) / span) * (b.v - a.v);
      const residual = p.v - chord;
      const reverses = sIn * sOut < 0 && Math.abs(sIn) > 0.04 && Math.abs(sOut) > 0.04;
      const spiked = reverses || Math.abs(sOut - sIn) > kinkFloor;
      if (!spiked) return p;
      const pull = reverses || Math.abs(residual) > 16 ? 0.7 : 0.5;
      return { t: p.t, v: clampTemp(p.v + (chord - p.v) * pull) };
    });
    pts[0] = first;
    pts[pts.length - 1] = last;
  }
  return pts;
}

function slopeDelta(a: Point, p: Point, b: Point): number {
  const dt1 = Math.max(1e-6, p.t - a.t);
  const dt2 = Math.max(1e-6, b.t - p.t);
  return (b.v - p.v) / dt2 - (p.v - a.v) / dt1;
}

function cubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function evalSegment(seg: BezierSegment, t: number): Point {
  return {
    t: cubic(seg.start.t, seg.cp1.t, seg.cp2.t, seg.end.t, t),
    v: cubic(seg.start.v, seg.cp1.v, seg.cp2.v, seg.end.v, t),
  };
}

export function expandCurve(curve: CurveData, stepsPerSeg = 60): Point[] {
  const pts: Point[] = [];
  if (curve.segments.length === 0) return [...curve.anchors];
  curve.segments.forEach((seg, si) => {
    const start = si === 0 ? 0 : 1;
    for (let k = start; k <= stepsPerSeg; k++) {
      pts.push(evalSegment(seg, k / stepsPerSeg));
    }
  });
  return pts;
}

export function sampleAtTime(poly: Point[], t: number): number | null {
  if (poly.length === 0) return null;
  const lo = poly[0].t;
  const hi = poly[poly.length - 1].t;
  return valueAtTime(poly, Math.max(lo, Math.min(hi, t)));
}

export function valueAtTime(poly: Point[], t: number): number | null {
  if (poly.length === 0) return null;
  if (t < poly[0].t || t > poly[poly.length - 1].t) return null;
  for (let i = 0; i + 1 < poly.length; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    if (t >= a.t && t <= b.t) {
      if (b.t === a.t) return a.v;
      const f = (t - a.t) / (b.t - a.t);
      return a.v + f * (b.v - a.v);
    }
  }
  return poly[poly.length - 1].v;
}

export function timeAtValue(poly: Point[], value: number): number | null {
  for (let i = 0; i + 1 < poly.length; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const lo = Math.min(a.v, b.v);
    const hi = Math.max(a.v, b.v);
    if (value >= lo && value <= hi) {
      if (b.v === a.v) return a.t;
      const f = (value - a.v) / (b.v - a.v);
      return a.t + f * (b.t - a.t);
    }
  }
  return null;
}

export function maxValue(poly: Point[]): number {
  let m = -Infinity;
  for (const p of poly) if (p.v > m) m = p.v;
  return m;
}

export function levelToTemp(roastLevels: number[], level: number): number | null {
  if (roastLevels.length === 0) return null;
  const maxIdx = roastLevels.length - 1;
  const L = Math.max(0, Math.min(maxIdx, level));
  const i = Math.floor(L);
  if (i >= maxIdx) return roastLevels[maxIdx];
  const frac = L - i;
  return roastLevels[i] + frac * (roastLevels[i + 1] - roastLevels[i]);
}

export function rorSeries(poly: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 1; i < poly.length; i++) {
    const dt = poly[i].t - poly[i - 1].t;
    if (dt <= 0) continue;
    out.push({ t: poly[i].t, v: ((poly[i].v - poly[i - 1].v) / dt) * 60 });
  }
  return out;
}

export function shiftCurve(curve: CurveData, dt: number, dv: number): CurveData {
  const move = (p: Point): Point => ({ t: Math.max(0.1, p.t + dt), v: p.v + dv });
  return {
    anchors: curve.anchors.map(move),
    segments: curve.segments.map((s) => ({
      start: move(s.start),
      cp1: move(s.cp1),
      cp2: move(s.cp2),
      end: move(s.end),
    })),
  };
}

export function scaleCurveTime(curve: CurveData, factor: number): CurveData {
  const move = (p: Point): Point => ({ t: Math.max(0.1, p.t * factor), v: p.v });
  return {
    anchors: curve.anchors.map(move),
    segments: curve.segments.map((s) => ({
      start: move(s.start),
      cp1: move(s.cp1),
      cp2: move(s.cp2),
      end: move(s.end),
    })),
  };
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatClockFine(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const tenth = Math.round(seconds * 10);
  const m = Math.floor(tenth / 600);
  const s = (tenth % 600) / 10;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
