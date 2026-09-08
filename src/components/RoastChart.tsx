import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { clockTick, ROR_TICKS, TEMP_TICKS, timeTicks } from "../lib/chart";
import { expandCurve } from "../lib/curve";
import { KLOG_COL } from "../lib/klog";
import { type OverlayTrack, trackZones } from "../lib/overlay";

export function PreviewChart({
  roast,
  ror,
  fan,
  fcTime,
  endTime,
}: {
  roast: { t: number; v: number }[];
  ror: { t: number; v: number }[];
  fan: { t: number; v: number }[];
  fcTime?: number;
  endTime?: number;
}) {
  const rorMap = new Map(ror.map((p) => [Math.round(p.t), p.v]));
  const fanMap = new Map(fan.map((p) => [Math.round(p.t), p.v]));
  const data = roast.map((p) => ({
    t: p.t,
    bt: p.v,
    ror: rorMap.get(Math.round(p.t)) ?? null,
    fan: fanMap.get(Math.round(p.t)) ?? null,
  }));
  const fc = roast.find((p) => fcTime != null && Math.abs(p.t - fcTime) < 2);
  const end = roast.find((p) => endTime != null && Math.abs(p.t - endTime) < 2);

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 28 }}>
          <CartesianGrid stroke="#2c2c2e" />
          <XAxis
            dataKey="t"
            type="number"
            domain={[0, "dataMax"]}
            ticks={timeTicks(data[data.length - 1]?.t ?? 540)}
            interval={0}
            minTickGap={36}
            tickFormatter={clockTick}
            stroke="#8e8e93"
            tick={{ fontSize: 10 }}
            height={36}
            padding={{ left: 8, right: 12 }}
            label={{ value: "Time", position: "insideBottom", offset: -4, fill: "#8e8e93", fontSize: 11 }}
          />
          <YAxis
            yAxisId="temp"
            domain={[20, 230]}
            ticks={TEMP_TICKS}
            interval={0}
            stroke="#8e8e93"
            tick={{ fontSize: 10 }}
            width={40}
            label={{ value: "°C", angle: -90, position: "insideLeft", fill: "#8e8e93", fontSize: 11 }}
          />
          <YAxis
            yAxisId="ror"
            orientation="right"
            domain={[-5, 40]}
            ticks={ROR_TICKS}
            interval={0}
            stroke="#8e8e93"
            tick={{ fontSize: 10 }}
            width={32}
            label={{ value: "RoR", angle: 90, position: "insideRight", fill: "#8e8e93", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: "#1c1c1e", border: "1px solid #38383a", borderRadius: 12 }}
            labelFormatter={(v) => clockTick(Number(v))}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              if (!Number.isFinite(n)) return ["—", String(name)];
              return [n.toFixed(1), String(name)];
            }}
          />
          <Line yAxisId="temp" type="monotone" dataKey="bt" name="Bean" stroke="#0A84FF" strokeWidth={2} dot={false} />
          <Line yAxisId="ror" type="monotone" dataKey="ror" name="RoR" stroke="#FF9F0A" strokeWidth={1.5} dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="fan" name="Fan" stroke="#BF5AF2" strokeWidth={1.2} dot={false} hide />
          {fc && <ReferenceDot yAxisId="temp" x={fc.t} y={fc.v} r={4} fill="#FF453A" stroke="none" />}
          {end && <ReferenceDot yAxisId="temp" x={end.t} y={end.v} r={4} fill="#30D158" stroke="none" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OverlayChart({ tracks }: { tracks: OverlayTrack[] }) {
  const step = 2;
  let maxT = 60;
  const series: Record<string, number | null>[] = [];

  for (const track of tracks) {
    if (track.log) {
      for (const row of track.log.rows) {
        const t = row[KLOG_COL.time];
        if (t > track.log.roastEnd) continue;
        maxT = Math.max(maxT, t);
      }
    } else {
      const poly = expandCurve(track.profile.roast);
      maxT = Math.max(maxT, poly[poly.length - 1]?.t ?? 0);
    }
  }

  for (let t = 0; t <= maxT; t += step) {
    const row: Record<string, number | null> = { t };
    for (const track of tracks) {
      if (track.log) {
        const sample = track.log.rows.find((r) => Math.abs(r[KLOG_COL.time] - t) < step);
        if (sample && sample[KLOG_COL.time] <= track.log.roastEnd) {
          row[`${track.id}-actual`] = sample[KLOG_COL.meanTemp];
          row[`${track.id}-design`] = sample[KLOG_COL.profile];
          row[`${track.id}-ror`] = sample[KLOG_COL.actualROR];
        }
      } else {
        const poly = expandCurve(track.profile.roast);
        const hit = poly.find((p) => Math.abs(p.t - t) < step);
        row[`${track.id}-design`] = hit?.v ?? null;
      }
    }
    series.push(row);
  }

  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={series} margin={{ top: 12, right: 12, left: 8, bottom: 28 }}>
          <CartesianGrid stroke="#2c2c2e" />
          <XAxis
            dataKey="t"
            type="number"
            domain={[0, maxT]}
            ticks={timeTicks(maxT)}
            interval={0}
            minTickGap={36}
            tickFormatter={clockTick}
            stroke="#8e8e93"
            tick={{ fontSize: 10 }}
            height={36}
            padding={{ left: 8, right: 12 }}
            label={{ value: "Time", position: "insideBottom", offset: -4, fill: "#8e8e93", fontSize: 11 }}
          />
          <YAxis
            domain={[20, 230]}
            ticks={TEMP_TICKS}
            interval={0}
            stroke="#8e8e93"
            tick={{ fontSize: 10 }}
            width={40}
            label={{ value: "°C", angle: -90, position: "insideLeft", fill: "#8e8e93", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: "#1c1c1e", border: "1px solid #38383a", borderRadius: 12 }}
            labelFormatter={(v) => clockTick(Number(v))}
          />
          {tracks.flatMap((track) => {
            const zones = trackZones(track);
            return zones.map((z) => (
              <ReferenceArea
                key={`${track.id}-${z.key}`}
                x1={z.start}
                x2={z.end}
                fill={track.color}
                fillOpacity={0.08}
              />
            ));
          })}
          {tracks.map((track) => (
            <Line
              key={`${track.id}-d`}
              type="monotone"
              dataKey={`${track.id}-design`}
              name={`${track.name} design`}
              stroke={track.color}
              strokeDasharray="5 4"
              strokeWidth={1.6}
              dot={false}
              connectNulls
            />
          ))}
          {tracks
            .filter((t) => t.log)
            .map((track) => (
              <Line
                key={`${track.id}-a`}
                type="monotone"
                dataKey={`${track.id}-actual`}
                name={`${track.name} actual`}
                stroke={track.color}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
