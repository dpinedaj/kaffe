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

/** Neighbor average on interior points so dragged corners do not stay sharp. */
export function smoothAnchors(anchors: Point[], passes = 2): Point[] {
  if (anchors.length < 3) return anchors.map((p) => ({ t: p.t, v: p.v }));
  let pts = anchors.map((p) => ({ t: p.t, v: p.v }));
  const first = pts[0];
  const last = pts[pts.length - 1];
  for (let pass = 0; pass < passes; pass++) {
    const next = pts.map((p, i) => {
      if (i === 0 || i === pts.length - 1) return p;
      const a = pts[i - 1];
      const b = pts[i + 1];
      return {
        t: p.t * 0.5 + a.t * 0.25 + b.t * 0.25,
        v: p.v * 0.5 + a.v * 0.25 + b.v * 0.25,
      };
    });
    next[0] = first;
    next[next.length - 1] = last;
    for (let i = 1; i < next.length; i++) {
      if (next[i].t < next[i - 1].t + MIN_ANCHOR_GAP) {
        next[i] = { ...next[i], t: next[i - 1].t + MIN_ANCHOR_GAP };
      }
    }
    for (let i = next.length - 2; i > 0; i--) {
      if (next[i].t > next[i + 1].t - MIN_ANCHOR_GAP) {
        next[i] = { ...next[i], t: next[i + 1].t - MIN_ANCHOR_GAP };
      }
    }
    pts = next;
  }
  return pts;
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
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(0).padStart(2, "0")}`;
}

export function formatClockFine(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
