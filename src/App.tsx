import { useEffect, useState } from "react";
import LibraryPage from "./pages/LibraryPage";
import OverlayPage from "./pages/OverlayPage";
import Studio from "./pages/Studio";
import { defaultIntent, generateProfile, type RoastIntent } from "./lib/generate";
import type { OverlayTrack } from "./lib/overlay";
import {
  intentFromSaved,
  loadLibrary,
  removeProfile,
  savedFromGenerated,
  saveLibrary,
  type SavedProfile,
  upsertProfile,
} from "./lib/storage";

type Route = "studio" | "overlay" | "library";
type StudioTab = "parameters" | "flavor" | "curve";

export default function App() {
  const [route, setRoute] = useState<Route>("studio");
  const [studioTab, setStudioTab] = useState<StudioTab>("parameters");
  const [intent, setIntent] = useState<RoastIntent>(defaultIntent);
  const [library, setLibrary] = useState<SavedProfile[]>([]);
  const [savedId, setSavedId] = useState<string | undefined>();
  const [overlayTracks, setOverlayTracks] = useState<OverlayTrack[]>([]);
  const [overlayEditId, setOverlayEditId] = useState<string | null>(null);
  const [overlaySyncLevels, setOverlaySyncLevels] = useState(false);

  useEffect(() => {
    setLibrary(loadLibrary());
  }, []);

  function saveCurrent() {
    const generated = generateProfile(intent);
    const item = savedFromGenerated(generated.kproText, intent, generated.curveName, generated.profile, savedId);
    setLibrary(upsertProfile(item));
    setSavedId(item.id);
    setRoute("library");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <header className="sticky top-0 z-20 flex w-full items-center border-b border-line bg-ink/90 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-card2 text-[15px] font-bold">K</span>
          <div>
            <div className="text-[17px] font-semibold leading-none">Kaffe</div>
            <div className="text-[11px] text-muted">Nano 7 profile studio</div>
          </div>
        </div>
        <nav className="hidden shrink-0 gap-1 rounded-xl bg-card p-1 md:flex">
          <NavButton active={route === "studio"} onClick={() => setRoute("studio")}>
            Generate
          </NavButton>
          <NavButton active={route === "overlay"} onClick={() => setRoute("overlay")}>
            Overlay
          </NavButton>
          <NavButton active={route === "library"} onClick={() => setRoute("library")}>
            Library
          </NavButton>
        </nav>
        {import.meta.env.DEV && (
          <span className="hidden rounded-lg bg-card2 px-2 py-1 text-[11px] text-orange md:inline">Local AI</span>
        )}
        <div className="hidden flex-1 md:block" aria-hidden="true" />
      </header>

      <main className="flex min-h-0 flex-1 flex-col pb-20 md:pb-0">
        {route === "studio" && (
          <Studio
            intent={intent}
            setIntent={(next) => {
              setIntent(next);
              setSavedId(undefined);
            }}
            tab={studioTab}
            setTab={setStudioTab}
            onSave={saveCurrent}
          />
        )}
        <div className={route === "overlay" ? undefined : "hidden"}>
          <OverlayPage
            library={library}
            tracks={overlayTracks}
            setTracks={setOverlayTracks}
            editId={overlayEditId}
            setEditId={setOverlayEditId}
            syncLevels={overlaySyncLevels}
            setSyncLevels={setOverlaySyncLevels}
            onSaveToLibrary={(item) => setLibrary(upsertProfile(item))}
            onOpenInGenerate={(next, existingId) => {
              setIntent(next);
              setSavedId(existingId);
              setRoute("studio");
              setStudioTab("parameters");
            }}
            studioIntent={intent}
          />
        </div>
        {route === "library" && (
          <LibraryPage
            items={library}
            onOpen={(item, mode) => {
              setIntent(intentFromSaved(item));
              setSavedId(mode === "edit" ? item.id : undefined);
              setRoute("studio");
              setStudioTab("parameters");
            }}
            onToggleFavorite={(id) => {
              const next = library.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p));
              saveLibrary(next);
              setLibrary(next);
            }}
            onRename={(id, name) => {
              const next = library.map((p) => (p.id === id ? { ...p, curveName: name, name: name.replace(/\s+/g, "_").slice(0, 17) } : p));
              saveLibrary(next);
              setLibrary(next);
            }}
            onDelete={(id) => setLibrary(removeProfile(id))}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 px-4 py-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md justify-around">
          <TabIcon label="Generate" active={route === "studio"} onClick={() => setRoute("studio")} />
          <TabIcon label="Overlay" active={route === "overlay"} onClick={() => setRoute("overlay")} />
          <TabIcon label="Library" active={route === "library"} onClick={() => setRoute("library")} />
        </div>
      </nav>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${active ? "bg-card2 text-white" : "text-muted"}`}
    >
      {children}
    </button>
  );
}

function TabIcon({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`px-3 py-1 text-[11px] font-semibold ${active ? "text-blue" : "text-muted"}`}>
      {label}
    </button>
  );
}
