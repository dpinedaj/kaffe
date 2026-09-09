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
import { clockTick, FAN_RPM_MAX, FAN_RPM_MIN, FAN_TICKS, ROR_TICKS, TEMP_TICKS, timeTicks } from "../lib/chart";
import { expandCurve, sampleAtTime } from "../lib/curve";
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
          <YAxis yAxisId="fan" domain={[FAN_RPM_MIN, FAN_RPM_MAX]} hide />
          <Tooltip
            contentStyle={{ background: "#1c1c1e", border: "1px solid #38383a", borderRadius: 12 }}
            labelFormatter={(v) => clockTick(Number(v))}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              if (!Number.isFinite(n)) return ["—", String(name)];
              if (String(name) === "Fan") return [`${Math.round(n)} RPM`, "Fan"];
              return [n.toFixed(1), String(name)];
            }}
          />
          <Line yAxisId="temp" type="monotone" dataKey="bt" name="Bean" stroke="#0A84FF" strokeWidth={2} dot={false} />
          <Line yAxisId="ror" type="monotone" dataKey="ror" name="RoR" stroke="#FF9F0A" strokeWidth={1.5} dot={false} />
          <Line
            yAxisId="fan"
            type="monotone"
            dataKey="fan"
            name="Fan"
            stroke="#BF5AF2"
            strokeWidth={1.4}
            strokeDasharray="6 3"
            dot={false}
          />
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
  const fanPolys = tracks.map((track) => expandCurve(track.profile.fan));

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
    tracks.forEach((track, i) => {
      row[`${track.id}-fan-design`] = sampleAtTime(fanPolys[i], t);
      if (track.log) {
        const sample = track.log.rows.find((r) => Math.abs(r[KLOG_COL.time] - t) < step);
        if (sample && sample[KLOG_COL.time] <= track.log.roastEnd) {
          row[`${track.id}-actual`] = sample[KLOG_COL.meanTemp];
          row[`${track.id}-design`] = sample[KLOG_COL.profile];
          row[`${track.id}-ror`] = sample[KLOG_COL.actualROR];
          const rpm = sample[KLOG_COL.actualFanRPM];
          row[`${track.id}-fan-actual`] = rpm > 1000 ? rpm : null;
        }
      } else {
        const poly = expandCurve(track.profile.roast);
        const hit = poly.find((p) => Math.abs(p.t - t) < step);
        row[`${track.id}-design`] = hit?.v ?? null;
      }
    });
    series.push(row);
  }

  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={series} margin={{ top: 12, right: 44, left: 8, bottom: 28 }}>
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
            yAxisId="fan"
            orientation="right"
            domain={[FAN_RPM_MIN, FAN_RPM_MAX]}
            ticks={FAN_TICKS}
            interval={0}
            stroke="#8e8e93"
            tick={{ fontSize: 10 }}
            width={44}
            tickFormatter={(v) => String(v)}
            label={{ value: "RPM", angle: 90, position: "insideRight", fill: "#8e8e93", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: "#1c1c1e", border: "1px solid #38383a", borderRadius: 12 }}
            labelFormatter={(v) => clockTick(Number(v))}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              if (!Number.isFinite(n)) return ["—", String(name)];
              if (String(name).toLowerCase().includes("fan")) return [`${Math.round(n)} RPM`, String(name)];
              return [n.toFixed(1), String(name)];
            }}
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
              yAxisId="temp"
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
          {tracks.map((track) => (
            <Line
              key={`${track.id}-fd`}
              yAxisId="fan"
              type="monotone"
              dataKey={`${track.id}-fan-design`}
              name={`${track.name} fan`}
              stroke={track.color}
              strokeDasharray="2 4"
              strokeWidth={1.3}
              dot={false}
              connectNulls
            />
          ))}
          {tracks
            .filter((t) => t.log)
            .map((track) => (
              <Line
                key={`${track.id}-a`}
                yAxisId="temp"
                type="monotone"
                dataKey={`${track.id}-actual`}
                name={`${track.name} actual`}
                stroke={track.color}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          {tracks
            .filter((t) => t.log)
            .map((track) => (
              <Line
                key={`${track.id}-fa`}
                yAxisId="fan"
                type="monotone"
                dataKey={`${track.id}-fan-actual`}
                name={`${track.name} fan actual`}
                stroke={track.color}
                strokeWidth={1.4}
                dot={false}
                connectNulls
              />
            ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
