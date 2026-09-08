import { useRef, useState } from "react";
import { clockTick, ROR_TICKS, TEMP_TICKS, timeTickAnchor, timeTicks } from "../lib/chart";
import { deleteAnchor, formatClock, insertAnchor, sampleAtTime, smoothAnchors } from "../lib/curve";
import type { ActiveZone, Point } from "../lib/kpro";

const ZONE_FILL: Record<string, string> = {
  zone1: "#FFD60A",
  zone2: "#BF5AF2",
  zone3: "#FF9F0A",
  corner1: "#64D2FF",
};

const W = 720;
const H = 360;
const PAD = { l: 52, r: 48, t: 18, b: 46 };
const PLOT_W = W - PAD.l - PAD.r;
const ROR_MIN = -5;
const ROR_MAX = 40;

export function InteractiveCurve({
  poly,
  anchors,
  ror = [],
  fcTime,
  endTime,
  zones = [],
  canReset = false,
  onAnchorsChange,
  onReset,
}: {
  poly: Point[];
  anchors: Point[];
  ror?: Point[];
  fcTime?: number;
  endTime?: number;
  zones?: ActiveZone[];
  canReset?: boolean;
  onAnchorsChange: (next: Point[]) => void;
  onReset?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [walkT, setWalkT] = useState<number | null>(null);
  const tMax = Math.max(poly[poly.length - 1]?.t ?? 540, 360);
  const tMin = poly[0]?.t ?? 0;
  const x = (t: number) => PAD.l + (t / tMax) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - 20) / 210) * (H - PAD.t - PAD.b);
  const yRor = (v: number) => PAD.t + (1 - (v - ROR_MIN) / (ROR_MAX - ROR_MIN)) * (H - PAD.t - PAD.b);

  function fromClient(clientX: number, clientY: number): Point {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * W;
    const sy = ((clientY - rect.top) / rect.height) * H;
    const t = ((sx - PAD.l) / (W - PAD.l - PAD.r)) * tMax;
    const v = 20 + (1 - (sy - PAD.t) / (H - PAD.t - PAD.b)) * 210;
    return { t, v };
  }

  function clampWalk(t: number) {
    return Math.max(tMin, Math.min(tMax, t));
  }

  function move(index: number, raw: Point) {
    const end = index === 0 || index === anchors.length - 1;
    const prev = anchors[index - 1];
    const next = anchors[index + 1];
    const minT = prev ? prev.t + 8 : 1;
    const maxT = next ? next.t - 8 : tMax;
    const t = end ? anchors[index].t : Math.max(minT, Math.min(maxT, raw.t));
    const v = Math.max(25, Math.min(228, raw.v));
    setWalkT(t);
    onAnchorsChange(anchors.map((p, i) => (i === index ? { t, v } : p)));
  }

  function addAtWalk() {
    const t = clampWalk(walkT ?? (tMin + tMax) / 2);
    const v = sampleAtTime(poly, t) ?? 150;
    const next = insertAnchor(anchors, { t, v });
    if (next.length === anchors.length) return;
    const idx = next.findIndex((p) => Math.abs(p.t - t) < 0.51);
    setSelected(idx >= 0 ? idx : null);
    setWalkT(t);
    onAnchorsChange(next);
  }

  function removeSelected() {
    if (selected == null) return;
    if (selected === 0 || selected === anchors.length - 1) return;
    const next = deleteAnchor(anchors, selected);
    if (next.length !== anchors.length) {
      setSelected(null);
      onAnchorsChange(next);
    }
  }

  const ticks = timeTicks(tMax, PLOT_W);
  const path = poly.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const rorPath = ror
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t).toFixed(1)} ${yRor(p.v).toFixed(1)}`)
    .join(" ");
  const fc = fcTime != null ? poly.find((p) => Math.abs(p.t - fcTime) < 3) : undefined;
  const end = endTime != null ? poly.find((p) => Math.abs(p.t - endTime) < 3) : undefined;
  const canDelete = selected != null && selected > 0 && selected < anchors.length - 1 && anchors.length > 3;
  const addPreviewT = walkT ?? (tMin + tMax) / 2;
  const canAdd = insertAnchor(anchors, { t: addPreviewT, v: sampleAtTime(poly, addPreviewT) ?? 150 }).length > anchors.length;

  const activeT = drag != null ? anchors[drag].t : walkT;
  const bean =
    drag != null ? anchors[drag].v : activeT != null ? sampleAtTime(poly, activeT) : null;
  const rorNow = activeT != null ? sampleAtTime(ror, activeT) : null;
  const walkBean = activeT != null ? sampleAtTime(poly, activeT) : null;

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canAdd}
          className="rounded-lg bg-card2 px-3 py-1.5 text-[12px] font-medium text-white disabled:text-muted"
          onClick={addAtWalk}
        >
          Add point
        </button>
        <button
          type="button"
          disabled={!canDelete}
          className="rounded-lg bg-card2 px-3 py-1.5 text-[12px] font-medium text-white disabled:text-muted"
          onClick={removeSelected}
        >
          Delete point
        </button>
        <button
          type="button"
          className="rounded-lg bg-blue px-3 py-1.5 text-[12px] font-semibold text-white"
          onClick={() => {
            setSelected(null);
            onAnchorsChange(smoothAnchors(anchors));
          }}
        >
          Smooth curve
        </button>
        <button
          type="button"
          disabled={!canReset}
          className="rounded-lg bg-card2 px-3 py-1.5 text-[12px] font-medium text-white disabled:text-muted"
          onClick={() => {
            setSelected(null);
            setWalkT(null);
            onReset?.();
          }}
        >
          Reset
        </button>
        <span className="text-[11px] text-muted">Walk, then Add point · Smooth eases spikes · first/last stay fixed in time</span>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-2 rounded-xl bg-card2 px-3 py-2 text-[12px]">
        <div>
          <div className="text-muted">Time</div>
          <div className="text-[15px] font-semibold text-white">{activeT != null ? formatClock(activeT) : "—"}</div>
        </div>
        <div>
          <div className="text-muted">Bean</div>
          <div className="text-[15px] font-semibold text-blue">{bean != null ? `${bean.toFixed(1)} °C` : "—"}</div>
        </div>
        <div>
          <div className="text-muted">RoR</div>
          <div className="text-[15px] font-semibold text-orange">
            {rorNow != null ? `${rorNow.toFixed(1)} °C/min` : "—"}
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-[340px] w-full touch-none"
        onPointerMove={(e) => {
          if (drag != null) {
            move(drag, fromClient(e.clientX, e.clientY));
            return;
          }
          setWalkT(clampWalk(fromClient(e.clientX, e.clientY).t));
        }}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        {TEMP_TICKS.map((v) => (
          <g key={`y-${v}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#2c2c2e" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fill="#8e8e93" fontSize="11">
              {v}
            </text>
          </g>
        ))}
        {ROR_TICKS.filter((v) => v >= 0).map((v) => (
          <text key={`ror-${v}`} x={W - PAD.r + 8} y={yRor(v) + 4} fill="#8e8e93" fontSize="10">
            {v}
          </text>
        ))}
        {ticks.map((t) => (
          <g key={`x-${t}`}>
            <line x1={x(t)} x2={x(t)} y1={PAD.t} y2={H - PAD.b} stroke="#2c2c2e" />
            <text x={x(t)} y={H - 20} textAnchor={timeTickAnchor(t, tMax)} fill="#8e8e93" fontSize="11">
              {clockTick(t)}
            </text>
          </g>
        ))}
        <text x={16} y={14} fill="#8e8e93" fontSize="11">
          °C
        </text>
        <text x={W - 8} y={14} textAnchor="end" fill="#8e8e93" fontSize="11">
          RoR
        </text>
        <text x={W / 2} y={H - 2} textAnchor="middle" fill="#8e8e93" fontSize="11">
          Time
        </text>
        {zones.map((z) => {
          const x1 = x(z.start);
          const x2 = x(z.end);
          const fill = ZONE_FILL[z.key] ?? "#BF5AF2";
          const label = z.boost != null ? `${z.label} ${z.boost > 0 ? "+" : ""}${z.boost}` : z.label;
          return (
            <g key={z.key}>
              <rect x={x1} y={PAD.t} width={Math.max(2, x2 - x1)} height={H - PAD.t - PAD.b} fill={fill} fillOpacity="0.16" />
              <text x={(x1 + x2) / 2} y={PAD.t + 12} textAnchor="middle" fill={fill} fontSize="10" fontWeight="600">
                {label}
              </text>
            </g>
          );
        })}
        {rorPath && <path d={rorPath} fill="none" stroke="#FF9F0A" strokeWidth="1.6" strokeDasharray="5 4" />}
        <path d={path} fill="none" stroke="#0A84FF" strokeWidth="2.2" />
        {activeT != null && walkBean != null && (
          <g>
            <line x1={x(activeT)} x2={x(activeT)} y1={PAD.t} y2={H - PAD.b} stroke="#636366" strokeDasharray="3 3" />
            <circle cx={x(activeT)} cy={y(walkBean)} r="4.5" fill="#0A84FF" stroke="#fff" strokeWidth="1.5" />
            {rorNow != null && (
              <circle cx={x(activeT)} cy={yRor(rorNow)} r="3.5" fill="#FF9F0A" stroke="#fff" strokeWidth="1.2" />
            )}
          </g>
        )}
        {fc && <circle cx={x(fc.t)} cy={y(fc.v)} r="4" fill="#FF453A" />}
        {end && <circle cx={x(end.t)} cy={y(end.v)} r="4" fill="#30D158" />}
        {anchors.map((p, i) => (
          <circle
            key={`${i}-${p.t}`}
            cx={x(p.t)}
            cy={y(p.v)}
            r={drag === i || selected === i ? 8 : 6}
            fill="#0A84FF"
            stroke={selected === i ? "#FFD60A" : "#fff"}
            strokeWidth="2"
            className={i === 0 || i === anchors.length - 1 ? "cursor-ns-resize" : "cursor-grab"}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (e.target as Element).setPointerCapture(e.pointerId);
              setDrag(i);
              setSelected(i);
              setWalkT(p.t);
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (i === 0 || i === anchors.length - 1) return;
              const next = deleteAnchor(anchors, i);
              if (next.length !== anchors.length) {
                setSelected(null);
                onAnchorsChange(next);
              }
            }}
            onPointerMove={(e) => {
              if (drag !== i) return;
              move(i, fromClient(e.clientX, e.clientY));
            }}
            onPointerUp={() => setDrag(null)}
          />
        ))}
      </svg>

      <label className="mt-2 block">
        <div className="mb-1 flex justify-between text-[11px] text-muted">
          <span>Walk curve</span>
          <span>{activeT != null ? formatClock(activeT) : "hover or drag the slider"}</span>
        </div>
        <input
          type="range"
          min={tMin}
          max={tMax}
          step={0.5}
          value={activeT ?? tMin}
          className="w-full"
          onChange={(e) => setWalkT(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
