import { useEffect, useState, type ReactNode } from "react";
import BrewPage from "./pages/BrewPage";
import LibraryPage from "./pages/LibraryPage";
import OverlayPage from "./pages/OverlayPage";
import Studio from "./pages/Studio";
import type { BrewAttach } from "./lib/brew";
import { defaultIntent, generateProfile, type RoastIntent } from "./lib/generate";
import type { OverlayTrack } from "./lib/overlay";
import { LocaleSwitch, useI18n } from "./i18n/LocaleContext";
import { InstallButton } from "./components/InstallButton";
import { BeanGlyph, CupGlyph, Welcome } from "./components/Welcome";
import { loadMode, loadRoaster, saveMode, saveRoaster, type AppMode } from "./lib/appMode";
import { roasterById, roasterName } from "./lib/roasters";
import {
  intentFromSaved,
  loadLibrary,
  removeProfile,
  savedFromGenerated,
  saveLibrary,
  type SavedProfile,
  upsertProfile,
} from "./lib/storage";

type Route = "studio" | "overlay" | "library" | "brew";
type StudioTab = "parameters" | "flavor" | "curve";

export default function App() {
  const { t } = useI18n();
  const [mode, setMode] = useState<AppMode | null>(() => loadMode());
  const [roasterId, setRoasterId] = useState(() => loadRoaster());
  const [route, setRoute] = useState<Route>(() => (loadMode() === "brew" ? "brew" : "studio"));
  const [studioTab, setStudioTab] = useState<StudioTab>("parameters");
  const [intent, setIntent] = useState<RoastIntent>(defaultIntent);
  const [library, setLibrary] = useState<SavedProfile[]>([]);
  const [savedId, setSavedId] = useState<string | undefined>();
  const [overlayTracks, setOverlayTracks] = useState<OverlayTrack[]>([]);
  const [overlayEditId, setOverlayEditId] = useState<string | null>(null);
  const [overlaySyncLevels, setOverlaySyncLevels] = useState(false);
  const [brewAttach, setBrewAttach] = useState<BrewAttach>({ kind: "generate" });

  useEffect(() => {
    setLibrary(loadLibrary());
  }, []);

  function chooseMode(next: AppMode) {
    setMode(next);
    saveMode(next);
    setRoute(next === "brew" ? "brew" : "studio");
    window.scrollTo({ top: 0 });
  }

  const roast = mode === "roast";
  const roaster = roasterById(roasterId);

  if (mode == null) {
    return (
      <Welcome
        onDone={(next, rid) => {
          if (rid) {
            setRoasterId(rid);
            saveRoaster(rid);
          }
          chooseMode(next);
        }}
      />
    );
  }

  function saveCurrent() {
    const generated = generateProfile(intent);
    const item = savedFromGenerated(generated.kproText, intent, generated.curveName, generated.profile, savedId);
    setLibrary(upsertProfile(item));
    setSavedId(item.id);
    setRoute("library");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <header className="sticky top-0 z-20 flex w-full items-center border-b border-line bg-ink/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img src="./icons/icon.svg" alt="" className="h-8 w-8 rounded-xl" />
          <div className="min-w-0">
            <div className="text-[17px] font-semibold leading-none">Kaffe</div>
            <div className="truncate text-[11px] text-muted">
              <span className="hidden sm:inline">
                {roast ? `${t("brand.roastTag")} · ${roasterName(roaster)}` : t("brand.brewTag")} ·{" "}
              </span>
              v{__APP_VERSION__}
            </div>
          </div>
        </div>
        {roast && (
        <nav className="hidden shrink-0 gap-1 rounded-xl bg-card p-1 md:flex">
          <NavButton active={route === "studio"} onClick={() => setRoute("studio")}>
            {t("nav.generate")}
          </NavButton>
          <NavButton active={route === "overlay"} onClick={() => setRoute("overlay")}>
            {t("nav.overlay")}
          </NavButton>
          <NavButton active={route === "library"} onClick={() => setRoute("library")}>
            {t("nav.library")}
          </NavButton>
          <NavButton active={route === "brew"} onClick={() => setRoute("brew")}>
            {t("nav.brew")}
          </NavButton>
        </nav>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {import.meta.env.DEV && (
            <span className="hidden rounded-lg bg-card2 px-2 py-1 text-[11px] text-orange md:inline">Local AI</span>
          )}
          <ModeSwitch mode={mode} onChange={chooseMode} />
          <InstallButton />
          <LocaleSwitch />
        </div>
      </header>

      <main
        className={`flex min-h-0 flex-1 flex-col md:pb-0 ${
          roast ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))]" : "pb-[env(safe-area-inset-bottom)]"
        }`}
      >
        {roast && route === "studio" && (
          <Studio
            intent={intent}
            setIntent={(next) => {
              setIntent(next);
              setSavedId(undefined);
            }}
            tab={studioTab}
            setTab={setStudioTab}
            onSave={saveCurrent}
            onBrew={() => {
              setBrewAttach({ kind: "generate" });
              setRoute("brew");
            }}
          />
        )}
        <div className={roast && route === "overlay" ? undefined : "hidden"}>
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
        {roast && route === "library" && (
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
            onPatch={(id, partial) => {
              const next = library.map((p) => (p.id === id ? { ...p, ...partial } : p));
              saveLibrary(next);
              setLibrary(next);
            }}
            onRename={(id, name) => {
              const next = library.map((p) => (p.id === id ? { ...p, curveName: name, name: name.replace(/\s+/g, "_").slice(0, 17) } : p));
              saveLibrary(next);
              setLibrary(next);
            }}
            onDelete={(id) => setLibrary(removeProfile(id))}
            onBrew={(item) => {
              setBrewAttach({ kind: "library", id: item.id });
              setRoute("brew");
            }}
          />
        )}
        {(route === "brew" || !roast) && (
          <BrewPage
            brewOnly={!roast}
            attach={brewAttach}
            setAttach={setBrewAttach}
            studioIntent={intent}
            library={library}
          />
        )}
      </main>

      {roast && (
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 px-2 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md justify-around">
          <TabIcon label={t("nav.generate")} active={route === "studio"} onClick={() => setRoute("studio")}>
            <path d="M4 7h16M4 12h16M4 17h16M8 4.5v5M15 9.5v5M10 14.5v5" />
          </TabIcon>
          <TabIcon label={t("nav.overlay")} active={route === "overlay"} onClick={() => setRoute("overlay")}>
            <rect x="3.5" y="7.5" width="11" height="11" rx="1.5" />
            <rect x="9.5" y="3.5" width="11" height="11" rx="1.5" />
          </TabIcon>
          <TabIcon label={t("nav.library")} active={route === "library"} onClick={() => setRoute("library")}>
            <rect x="6" y="4" width="12" height="16" rx="1.5" />
            <path d="M9 9h6M9 13h6" />
          </TabIcon>
          <TabIcon label={t("nav.brew")} active={route === "brew"} onClick={() => setRoute("brew")}>
            <path d="M7 8h8v6.5a3.5 3.5 0 01-7 0V8z" />
            <path d="M15 9.2h1.6a2 2 0 010 3.6H15" />
            <path d="M8 8V7a4 4 0 018 0v1" />
          </TabIcon>
        </div>
      </nav>
      )}
    </div>
  );
}

function ModeSwitch({ mode, onChange }: { mode: AppMode; onChange: (m: AppMode) => void }) {
  const { t } = useI18n();
  const items: [AppMode, string, ReactNode][] = [
    ["brew", t("mode.brew"), <CupGlyph key="c" />],
    ["roast", t("mode.roast"), <BeanGlyph key="b" />],
  ];
  return (
    <div className="flex rounded-lg bg-card2 p-0.5" role="radiogroup" aria-label={t("mode.label")}>
      {items.map(([id, label, glyph]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={mode === id}
          aria-label={label}
          title={label}
          onClick={() => mode !== id && onChange(id)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[12px] font-semibold ${
            mode === id ? "bg-card text-white" : "text-muted"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {glyph}
          </svg>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
  tag,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tag?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${active ? "bg-card2 text-white" : "text-muted"}`}
    >
      {children}
      {tag && <span className="ml-1 text-[10px] font-semibold text-orange">{tag}</span>}
    </button>
  );
}

function TabIcon({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 min-w-[64px] flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-semibold ${
        active ? "text-blue" : "text-muted"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
      {label}
    </button>
  );
}
