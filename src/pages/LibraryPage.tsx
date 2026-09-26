import { useState } from "react";
import { Card } from "../components/ui";
import { useI18n } from "../i18n/LocaleContext";
import { downloadText } from "../lib/generate";
import { daysSinceRoast, type SavedProfile } from "../lib/storage";
import { tastesForLot } from "../lib/taste";
import type { MessageKey } from "../i18n/en";

export default function LibraryPage({
  items,
  onOpen,
  onToggleFavorite,
  onRename,
  onPatch,
  onDelete,
  onBrew,
}: {
  items: SavedProfile[];
  onOpen: (item: SavedProfile, mode: "edit" | "base") => void;
  onToggleFavorite: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onPatch: (id: string, partial: Pick<SavedProfile, "roastedOn" | "notes">) => void;
  onDelete: (id: string) => void;
  onBrew: (item: SavedProfile) => void;
}) {
  const { t, locale } = useI18n();
  const sorted = [...items].sort((a, b) => Number(b.favorite) - Number(a.favorite));
  const [more, setMore] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <div>
        <h2 className="text-[22px] font-semibold">{t("library.title")}</h2>
        <p className="text-[13px] text-muted">{t("library.blurb")}</p>
      </div>
      {sorted.length === 0 ? (
        <Card className="p-8 text-center text-muted">{t("library.empty")}</Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <button type="button" className="text-left" onClick={() => onOpen(item, "edit")}>
                  <div className="text-[16px] font-semibold">{item.curveName}</div>
                  <div className="text-[12px] text-muted">
                    {item.name} · {new Date(item.createdAt).toLocaleString(locale === "es" ? "es" : "en")}
                  </div>
                </button>
                <button type="button" onClick={() => onToggleFavorite(item.id)} className="text-orange">
                  {item.favorite ? "★" : "☆"}
                </button>
              </div>
              <JournalRow item={item} onPatch={(partial) => onPatch(item.id, partial)} />
              <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
                <button
                  type="button"
                  className="rounded-lg bg-blue px-3 py-2 font-medium text-white"
                  onClick={() => onBrew(item)}
                >
                  {t("library.brewRecipe")}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-card2 px-3 py-2 font-medium text-blue"
                  onClick={() => onOpen(item, "edit")}
                >
                  {t("library.editGenerate")}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-card2 px-3 py-2 font-medium text-blue"
                  onClick={() => downloadText(`${item.name}.kpro`, item.kproText)}
                >
                  {t("common.download")}
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 font-medium text-muted"
                  aria-expanded={more === item.id}
                  onClick={() => setMore(more === item.id ? null : item.id)}
                >
                  {more === item.id ? t("library.less") : t("library.more")}
                </button>
              </div>
              {more === item.id && (
                <div className="mt-2 flex flex-wrap gap-2 text-[13px]">
                  <button
                    type="button"
                    className="rounded-lg bg-card2 px-3 py-2 font-medium text-blue"
                    onClick={() => onOpen(item, "base")}
                  >
                    {t("library.useBase")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-card2 px-3 py-2 font-medium text-blue"
                    onClick={() => {
                      const name = prompt(t("library.renamePrompt"), item.curveName);
                      if (name) onRename(item.id, name);
                    }}
                  >
                    {t("common.rename")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-card2 px-3 py-2 font-medium text-red"
                    onClick={() => {
                      if (confirm(t("library.deleteConfirm", { name: item.curveName }))) onDelete(item.id);
                    }}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <button
          type="button"
          className="text-[13px] text-blue"
          onClick={() => downloadText("kaffe-library.json", JSON.stringify(items, null, 2), "application/json")}
        >
          {t("library.exportJson")}
        </button>
      )}
    </div>
  );
}

function JournalRow({
  item,
  onPatch,
}: {
  item: SavedProfile;
  onPatch: (partial: Pick<SavedProfile, "roastedOn" | "notes">) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");
  const days = daysSinceRoast(item.roastedOn);
  const cups = tastesForLot(`library:${item.id}`);
  const last = cups[0];
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <label className="flex items-center gap-2">
          <span>{t("library.roasted")}</span>
          <input
            type="date"
            value={item.roastedOn ?? ""}
            onChange={(e) => onPatch({ roastedOn: e.target.value || undefined })}
            className="rounded-md bg-card2 px-2 py-1 text-[12px] text-white outline-none"
          />
        </label>
        {days != null && <span>{t("library.daysAgo", { days })}</span>}
        <button type="button" className="text-blue" onClick={() => setOpen(!open)}>
          {item.notes ? t("library.notesEdit") : t("library.notesAdd")}
        </button>
      </div>
      {item.notes && !open && <p className="mt-1 text-[13px] leading-relaxed text-label">{item.notes}</p>}
      {last && (
        <p className="mt-1 text-[12px] text-muted">
          {t("library.lastCup", { n: cups.length })} · {t(`taste.balance.${last.balance}` as MessageKey)} ·{" "}
          {t(`taste.strength.${last.strength}` as MessageKey)}
          {last.stars ? ` · ${"★".repeat(last.stars)}` : ""}
          {last.note ? ` · ${last.note}` : ""}
        </p>
      )}
      {open && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => onPatch({ notes: notes.trim() || undefined })}
          rows={3}
          placeholder={t("library.notesPh")}
          className="mt-2 w-full rounded-xl bg-card2 px-3 py-2 text-[13px] text-white outline-none placeholder:text-muted"
        />
      )}
    </div>
  );
}
