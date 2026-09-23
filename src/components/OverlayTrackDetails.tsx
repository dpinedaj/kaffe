import { useMemo } from "react";
import { useI18n } from "../i18n/LocaleContext";
import { Card } from "./ui";
import { summarizeOverlayTrack, type OverlayTrack } from "../lib/overlay";

export function OverlayTrackDetails({
  tracks,
  selectedId,
  onSelect,
}: {
  tracks: OverlayTrack[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const selected = tracks.find((t) => t.id === selectedId) ?? tracks[0];
  const selectedSummary = useMemo(
    () => (selected ? summarizeOverlayTrack(selected) : null),
    [selected],
  );

  if (tracks.length === 0 || !selected || !selectedSummary) return null;

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-[15px] font-semibold">{t("overlay.onBoard")}</h3>
        <p className="mt-1 text-[12px] text-muted">{t("overlay.onBoardHelp")}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {tracks.map((track) => {
          const summary = summarizeOverlayTrack(track);
          const active = track.id === selected.id;
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => onSelect(track.id)}
              className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                active ? "border-blue bg-blue/10" : "border-line bg-card2 hover:border-label"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <i className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: track.color }} />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{track.name}</div>
                    <div className="truncate text-[11px] text-muted">
                      {track.kind === "log" ? t("overlay.log") : t("overlay.designKind")}
                      {summary.designer ? ` · ${summary.designer}` : ""}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-muted">L{track.level.toFixed(1)}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {summary.headline.map((row) => (
                  <div key={row.label}>
                    <dt className="text-[10px] uppercase tracking-wide text-muted">{row.label}</dt>
                    <dd className="text-[12px] tabular-nums text-white">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <div className="mb-3">
          <h4 className="text-[15px] font-semibold">{selectedSummary.name}</h4>
          {selectedSummary.description ? (
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
              {selectedSummary.description}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {selectedSummary.sections.map((section) => (
            <section key={section.id} className="rounded-2xl bg-card2 p-3">
              <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-orange">{section.title}</h5>
              <dl className="space-y-1.5">
                {section.rows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3 text-[13px]">
                    <dt className="shrink-0 text-muted">{row.label}</dt>
                    <dd className="min-w-0 text-right tabular-nums leading-snug break-words text-white">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </Card>
  );
}
