import { Card } from "../components/ui";
import { useI18n } from "../i18n/LocaleContext";
import { downloadText } from "../lib/generate";
import type { SavedProfile } from "../lib/storage";

export default function LibraryPage({
  items,
  onOpen,
  onToggleFavorite,
  onRename,
  onDelete,
  onBrew,
}: {
  items: SavedProfile[];
  onOpen: (item: SavedProfile, mode: "edit" | "base") => void;
  onToggleFavorite: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onBrew: (item: SavedProfile) => void;
}) {
  const { t, locale } = useI18n();
  const sorted = [...items].sort((a, b) => Number(b.favorite) - Number(a.favorite));

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
              <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
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
                  onClick={() => onOpen(item, "base")}
                >
                  {t("library.useBase")}
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
                  className="rounded-lg bg-card2 px-3 py-2 font-medium text-blue"
                  onClick={() => onBrew(item)}
                >
                  {t("library.brewRecipe")}
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
                  onClick={() => onDelete(item.id)}
                >
                  {t("common.delete")}
                </button>
              </div>
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
