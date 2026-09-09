import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { InteractiveCurve } from "../components/InteractiveCurve";
import { OverlayCoach } from "../components/OverlayCoach";
import { OverlayChart } from "../components/RoastChart";
import { Card } from "../components/ui";
import { expandCurve, formatClock, formatClockFine, rebuildFromAnchors, rorSeries, timeAtValue } from "../lib/curve";
import { defaultIntent, downloadText, type RoastIntent } from "../lib/generate";
import { isLocalAiUiEnabled } from "../lib/ai/overlayCoach";
import { parseKlog, type RoastLog } from "../lib/klog";
import { activeZones, encodeKpro, parseKpro, type KproProfile, type Point } from "../lib/kpro";
import { newSavedId, type SavedProfile } from "../lib/storage";
import {
  computeDeviationSummary,
  computePhases,
  defaultAlignTemp,
  defaultLevel,
  DIFF_FIELDS,
  formatScalar,
  PALETTE,
  type OverlayTrack,
} from "../lib/overlay";
async function readFile(file: File): Promise<string> {
  return file.text();
}

export default function OverlayPage({
  library,
  tracks,
  setTracks,
  editId,
  setEditId,
  syncLevels,
  setSyncLevels,
  onSaveToLibrary,
  onOpenInGenerate,
  studioIntent,
}: {
  library: SavedProfile[];
  tracks: OverlayTrack[];
  setTracks: Dispatch<SetStateAction<OverlayTrack[]>>;
  editId: string | null;
  setEditId: (id: string | null) => void;
  syncLevels: boolean;
  setSyncLevels: (on: boolean) => void;
  onSaveToLibrary: (item: SavedProfile) => void;
  onOpenInGenerate: (intent: RoastIntent, existingId?: string) => void;
  studioIntent: RoastIntent;
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function addFiles(files: FileList | File[]) {
    setError(null);
    const next = [...tracks];
    for (const file of Array.from(files)) {
      const text = await readFile(file);
      const id = `${file.name}-${next.length}`;
      try {
        if (/\.klog$/i.test(file.name)) {
          const log = parseKlog(text, file.name);
          next.push(trackFromLog(id, log, PALETTE[next.length % PALETTE.length]));
        } else if (/\.kpro$/i.test(file.name)) {
          const profile = parseKpro(text, file.name);
          next.push(trackFromProfile(id, profile, PALETTE[next.length % PALETTE.length]));
        } else {
          setError("Use .kpro or .klog files.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not parse file");
      }
    }
    setTracks(next);
  }

  async function loadExample(kind: "profiles" | "logs") {
    try {
      if (kind === "profiles") {
        const [a, b] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}examples/example-profile-a.kpro`).then((r) => r.text()),
          fetch(`${import.meta.env.BASE_URL}examples/example-profile-b.kpro`).then((r) => r.text()),
        ]);
        setTracks([
          trackFromProfile("ex-a", parseKpro(a, "Rwanda_Nordic2.kpro"), PALETTE[0]),
          trackFromProfile("ex-b", parseKpro(b, "Rwanda_Nordic3.kpro"), PALETTE[1]),
        ]);
      } else {
        const text = await fetch(`${import.meta.env.BASE_URL}examples/example-align-a.klog`).then((r) => r.text());
        if (!text || text.startsWith("<!")) {
          setError("Example log is not bundled. Drop your own .klog.");
          return;
        }
        const log = parseKlog(text, "example-align-a.klog");
        setTracks([trackFromLog("ex-log", log, PALETTE[0])]);
      }
    } catch {
      setError("Could not load examples.");
    }
  }

  const logs = tracks.filter((t) => t.log).map((t) => t.log!);
  const profileTracks = tracks.filter((t) => t.kind === "profile");
  const editTrack = profileTracks.find((t) => t.id === editId) ?? profileTracks[0];
  const editPoly = editTrack ? expandCurve(editTrack.profile.roast) : [];
  const editFcTemp = editTrack ? Number.parseFloat(editTrack.profile.raw.expect_fc ?? "") : NaN;
  const editFcTime = Number.isFinite(editFcTemp) ? (timeAtValue(editPoly, editFcTemp) ?? undefined) : undefined;
  const editEndTime = editPoly[editPoly.length - 1]?.t;
  const editRor = editPoly.length ? rorSeries(editPoly) : [];
  const editLibraryId = editTrack?.id.startsWith("lib-") ? editTrack.id.slice(4) : undefined;
  const editLibraryItem = editLibraryId ? library.find((item) => item.id === editLibraryId) : undefined;
  const overlayBaselines = useRef(new Map<string, Point[]>());
  if (editTrack && !overlayBaselines.current.has(editTrack.id)) {
    overlayBaselines.current.set(
      editTrack.id,
      editTrack.profile.roast.anchors.map((p) => ({ t: p.t, v: p.v })),
    );
  }
  const overlayBaseline = editTrack ? overlayBaselines.current.get(editTrack.id) : undefined;
  const overlayDirty =
    Boolean(editTrack && overlayBaseline) &&
    JSON.stringify(editTrack?.profile.roast.anchors) !== JSON.stringify(overlayBaseline);

  function intentFromEdit(): RoastIntent {
    return {
      ...(editLibraryItem?.intent ?? defaultIntent()),
      name: editLibraryItem?.intent.name ?? editTrack?.profile.name,
      manualAnchors: editTrack?.profile.roast.anchors.map((p) => ({ t: p.t, v: p.v })),
    };
  }

  function savedFromEdit(): SavedProfile | null {
    if (!editTrack) return null;
    const profile = editTrack.profile;
    return {
      id: editLibraryItem?.id ?? newSavedId(),
      name: profile.name,
      favorite: editLibraryItem?.favorite ?? false,
      createdAt: editLibraryItem?.createdAt ?? new Date().toISOString(),
      kproText: encodeKpro(profile),
      intent: intentFromEdit(),
      curveName: editLibraryItem?.curveName ?? profile.name,
    };
  }

  function applyEditAnchors(anchors: Point[]) {
    if (!editTrack) return;
    const roast = rebuildFromAnchors(anchors);
    setTracks((prev) =>
      prev.map((t) => (t.id === editTrack.id ? { ...t, profile: { ...t.profile, roast } } : t)),
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4">
      <Card className="p-5">
        <h2 className="text-[17px] font-semibold">See the roast against its design</h2>
        <p className="mt-1 text-[13px] text-muted">
          Files stay in this browser. Compare several .kpro files, or drop a .klog to overlay measured
          temperature on the machine’s own design curve.
        </p>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-card2 px-4 py-10 text-center">
          <input
            type="file"
            accept=".kpro,.klog"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="text-[15px] font-medium">Drop .kpro or .klog here</div>
          <div className="mt-1 text-[13px] text-muted">or click to choose files</div>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg bg-card2 px-3 py-2 text-[13px]" onClick={() => void loadExample("profiles")}>
            Example profiles
          </button>
          <button type="button" className="rounded-lg bg-card2 px-3 py-2 text-[13px]" onClick={() => void loadExample("logs")}>
            Example log
          </button>
          {tracks.length > 0 && (
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-[13px] text-red"
              onClick={() => {
                setTracks([]);
                setEditId(null);
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-4">
          <h3 className="mb-2 text-[13px] font-semibold text-label">From library</h3>
          {library.length === 0 ? (
            <p className="text-[13px] text-muted">Save a generated profile first, then load it here to compare.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {library.map((item) => {
                const loaded = tracks.some((t) => t.id === `lib-${item.id}`);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-card2 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium">{item.curveName}</div>
                      <div className="text-[11px] text-muted">{item.name}</div>
                    </div>
                    <button
                      type="button"
                      disabled={loaded}
                      className="shrink-0 text-[13px] text-blue disabled:text-muted"
                      onClick={() => {
                        try {
                          const profile = parseKpro(item.kproText, `${item.name}.kpro`);
                          setTracks((prev) => [
                            ...prev,
                            trackFromProfile(`lib-${item.id}`, { ...profile, name: item.curveName }, PALETTE[prev.length % PALETTE.length]),
                          ]);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Could not load library profile");
                        }
                      }}
                    >
                      {loaded ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-[13px] text-orange">{error}</p>}
      </Card>

      {isLocalAiUiEnabled() && (
        <OverlayCoach
          tracks={tracks}
          baseIntent={editLibraryItem?.intent ?? studioIntent}
          onOpenInGenerate={(next) => onOpenInGenerate(next)}
          onAddGeneratedTrack={(track) => setTracks((prev) => [...prev, track])}
        />
      )}

      {tracks.length > 0 && (
        <>
          <Card className="p-4">
            <OverlayChart tracks={tracks} />
            <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-muted">
              {tracks.map((t) => (
                <span key={t.id} className="flex items-center gap-2">
                  <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                  {t.name} {t.log ? "(solid actual / dashed design)" : "(design)"}
                  <span className="text-muted"> · dotted fan</span>
                </span>
              ))}
            </div>
          </Card>

          {editTrack && (
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold">Edit design</h3>
                  <p className="mt-1 text-[12px] text-muted">
                    Add or delete points on a .kpro, then Smooth curve so corners do not stay sharp.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={editTrack.id}
                    onChange={(e) => setEditId(e.target.value)}
                    className="rounded-lg bg-card2 px-3 py-2 text-[13px] text-white outline-none"
                  >
                    {profileTracks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded-lg bg-card2 px-3 py-2 text-[13px] font-semibold text-white"
                    onClick={() => {
                      const item = savedFromEdit();
                      if (!item || !editTrack) return;
                      onSaveToLibrary(item);
                      if (!editTrack.id.startsWith("lib-")) {
                        setTracks((prev) =>
                          prev.map((t) => (t.id === editTrack.id ? { ...t, id: `lib-${item.id}` } : t)),
                        );
                        setEditId(`lib-${item.id}`);
                      }
                      setNotice("Saved to library. Open it in Generate to edit bean info or fork it as a base.");
                    }}
                  >
                    Save to library
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-card2 px-3 py-2 text-[13px] font-semibold text-white"
                    onClick={() => onOpenInGenerate(intentFromEdit(), editLibraryItem?.id)}
                  >
                    Edit in Generate
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-card2 px-3 py-2 text-[13px] font-semibold text-white"
                    onClick={() => onOpenInGenerate(intentFromEdit())}
                  >
                    Use as base
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-blue px-3 py-2 text-[13px] font-semibold text-white"
                    onClick={() => {
                      const text = encodeKpro(editTrack.profile);
                      downloadText(editTrack.profile.fileName || `${editTrack.name}.kpro`, text);
                    }}
                  >
                    Download edited .kpro
                  </button>
                </div>
              </div>
              {notice && <p className="mb-2 text-[12px] text-blue">{notice}</p>}
              <InteractiveCurve
                poly={editPoly}
                anchors={editTrack.profile.roast.anchors}
                ror={editRor}
                fan={editTrack ? expandCurve(editTrack.profile.fan) : []}
                fcTime={editFcTime}
                endTime={editEndTime}
                zones={activeZones(editTrack.profile.raw)}
                canReset={overlayDirty}
                onReset={() => {
                  if (!overlayBaseline) return;
                  applyEditAnchors(overlayBaseline.map((p) => ({ t: p.t, v: p.v })));
                }}
                onAnchorsChange={applyEditAnchors}
              />
            </Card>
          )}

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Level</h3>
              <label className="flex items-center gap-2 text-[13px] text-muted">
                <input type="checkbox" checked={syncLevels} onChange={(e) => setSyncLevels(e.target.checked)} />
                Sync all
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {tracks.map((t) => (
                <label key={t.id} className="block text-[13px]">
                  <div className="mb-1 flex justify-between">
                    <span>{t.name}</span>
                    <span>{t.level.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    step={0.1}
                    value={t.level}
                    className="w-full"
                    onChange={(e) => {
                      const level = Number(e.target.value);
                      setTracks((prev) =>
                        prev.map((x) => (syncLevels || x.id === t.id ? { ...x, level } : x)),
                      );
                    }}
                  />
                </label>
              ))}
            </div>
          </Card>

          <DiffTable tracks={tracks} />

          {logs.map((log) => (
            <LogPanels key={log.fileName} log={log} />
          ))}
        </>
      )}
    </div>
  );
}

function trackFromProfile(id: string, profile: KproProfile, color: string): OverlayTrack {
  return { id, kind: "profile", color, name: profile.name, profile, level: defaultLevel(profile) };
}

function trackFromLog(id: string, log: RoastLog, color: string): OverlayTrack {
  return {
    id,
    kind: "log",
    color,
    name: log.name,
    profile: log.design,
    log,
    level: defaultLevel(log.design, log),
  };
}

function DiffTable({ tracks }: { tracks: OverlayTrack[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, typeof DIFF_FIELDS>();
    for (const field of DIFF_FIELDS) {
      const list = map.get(field.group) ?? [];
      list.push(field);
      map.set(field.group, list);
    }
    return [...map.entries()];
  }, []);
  if (tracks.length === 0) return null;
  const base = tracks[0];

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="px-4 py-3 font-medium">Item</th>
            {tracks.map((t, i) => (
              <th key={t.id} className="px-4 py-3 font-medium">
                <span className="inline-flex items-center gap-2">
                  <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                  {t.name}
                  {i === 0 && <span className="text-[11px] text-muted">baseline</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(([group, fields]) => (
            <GroupRows key={group} group={group} fields={fields} tracks={tracks} base={base} />
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function GroupRows({
  group,
  fields,
  tracks,
  base,
}: {
  group: string;
  fields: typeof DIFF_FIELDS;
  tracks: OverlayTrack[];
  base: OverlayTrack;
}) {
  return (
    <>
      <tr className="bg-card2/60">
        <td colSpan={tracks.length + 1} className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange">
          {group}
        </td>
      </tr>
      {fields.map((field) => {
        const baseVal = base.profile.raw[field.key];
        return (
          <tr key={field.key} className="border-b border-line/70">
            <td className="px-4 py-2 text-muted">
              {field.label}
              {field.unit && <span className="ml-1 text-[11px] text-muted">{field.unit}</span>}
            </td>
            {tracks.map((t, i) => {
              const val = t.profile.raw[field.key];
              const differs = i > 0 && (val ?? "") !== (baseVal ?? "");
              return (
                <td key={t.id} className={`px-4 py-2 tabular-nums ${differs ? "bg-orange/10 font-semibold text-orange" : ""}`}>
                  {formatScalar(val)}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

function LogPanels({ log }: { log: RoastLog }) {
  const phases = computePhases(log);
  const dev = computeDeviationSummary(log);
  const align = defaultAlignTemp(log);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4">
        <h3 className="mb-2 text-[15px] font-semibold">Phases · {log.name}</h3>
        <p className="mb-3 text-[12px] text-muted">Align-by-temperature default {align.toFixed(1)} °C (mean_temp at FC).</p>
        <dl className="space-y-2 text-[14px]">
          <div className="flex justify-between"><dt className="text-muted">Dry end</dt><dd>{phases.dryEnd != null ? formatClockFine(phases.dryEnd) : "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Maillard</dt><dd>{phases.maillard != null ? formatClockFine(phases.maillard) : "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Development</dt><dd>{phases.development != null ? formatClockFine(phases.development) : "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">DTR</dt><dd>{phases.dtr != null ? `${(phases.dtr * 100).toFixed(2)}%` : "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Roast end</dt><dd>{formatClock(log.roastEnd)}</dd></div>
        </dl>
      </Card>
      <Card className="p-4">
        <h3 className="mb-2 text-[15px] font-semibold">Deviation ±3 °C</h3>
        <dl className="space-y-2 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-muted">Max above</dt>
            <dd>{dev.maxAbove ? `${dev.maxAbove.value.toFixed(2)} °C @ ${formatClock(dev.maxAbove.t)}` : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Max below</dt>
            <dd>{dev.maxBelow ? `${dev.maxBelow.value.toFixed(2)} °C @ ${formatClock(dev.maxBelow.t)}` : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Converged</dt>
            <dd>{dev.converged != null ? formatClock(dev.converged) : "never inside band"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">At end</dt>
            <dd>{dev.atEnd != null ? `${dev.atEnd.toFixed(2)} °C` : "—"}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
