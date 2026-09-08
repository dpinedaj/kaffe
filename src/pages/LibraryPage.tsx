import { Card } from "../components/ui";
import { downloadText } from "../lib/generate";
import type { SavedProfile } from "../lib/storage";

export default function LibraryPage({
  items,
  onOpen,
  onToggleFavorite,
  onRename,
  onDelete,
}: {
  items: SavedProfile[];
  onOpen: (item: SavedProfile) => void;
  onToggleFavorite: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const sorted = [...items].sort((a, b) => Number(b.favorite) - Number(a.favorite));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <div>
        <h2 className="text-[22px] font-semibold">Library</h2>
        <p className="text-[13px] text-muted">Saved on this device. Export a JSON backup anytime.</p>
      </div>
      {sorted.length === 0 ? (
        <Card className="p-8 text-center text-muted">No saved profiles yet. Generate one and tap Save to library.</Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <button type="button" className="text-left" onClick={() => onOpen(item)}>
                  <div className="text-[16px] font-semibold">{item.curveName}</div>
                  <div className="text-[12px] text-muted">
                    {item.name} · {new Date(item.createdAt).toLocaleString()}
                  </div>
                </button>
                <button type="button" onClick={() => onToggleFavorite(item.id)} className="text-orange">
                  {item.favorite ? "★" : "☆"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
                <button type="button" className="text-blue" onClick={() => downloadText(`${item.name}.kpro`, item.kproText)}>
                  Download
                </button>
                <button
                  type="button"
                  className="text-blue"
                  onClick={() => {
                    const name = prompt("Rename profile", item.curveName);
                    if (name) onRename(item.id, name);
                  }}
                >
                  Rename
                </button>
                <button type="button" className="text-red" onClick={() => onDelete(item.id)}>
                  Delete
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
          Export library JSON
        </button>
      )}
    </div>
  );
}
