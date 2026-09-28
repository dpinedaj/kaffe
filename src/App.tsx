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
import { AppMenu } from "./components/AppMenu";
import { RoasterSelect } from "./components/RoasterSelect";
import { clearMode, loadMode, loadRoaster, saveMode, saveRoaster, type AppMode } from "./lib/appMode";
import { roasterById, type RoasterId } from "./lib/roasters";
import {
  intentFromSaved,
  loadLibrary,
  removeProfile,
  savedFromGenerated,
  saveLibrary,
  type SavedProfile,
  upsertProfile,
} from "./lib/storage";

type RoastRoute = "studio" | "overlay" | "library";
type StudioTab = "parameters" | "flavor" | "curve";
export type BrewSource = "bag" | "profile";

export default function App() {
  const { t } = useI18n();
  const [mode, setMode] = useState<AppMode | null>(() => loadMode());
  const [roasterId, setRoasterId] = useState(() => loadRoaster());
  const [roastRoute, setRoastRoute] = useState<RoastRoute>("studio");
  const [studioTab, setStudioTab] = useState<StudioTab>("parameters");
  const [intent, setIntent] = useState<RoastIntent>(defaultIntent);
  const [library, setLibrary] = useState<SavedProfile[]>([]);
  const [savedId, setSavedId] = useState<string | undefined>();
  const [overlayTracks, setOverlayTracks] = useState<OverlayTrack[]>([]);
  const [overlayEditId, setOverlayEditId] = useState<string | null>(null);
  const [overlaySyncLevels, setOverlaySyncLevels] = useState(false);
  const [brewAttach, setBrewAttach] = useState<BrewAttach>({ kind: "generate" });
  const [brewSource, setBrewSource] = useState<BrewSource>("bag");

  useEffect(() => {
    setLibrary(loadLibrary());
  }, []);

  function go(next: AppMode, roastAt?: RoastRoute) {
    setMode(next);
    saveMode(next);
    if (roastAt) setRoastRoute(roastAt);
    window.scrollTo({ top: 0 });
  }

  function pickRoaster(id: RoasterId) {
    setRoasterId(id);
    saveRoaster(id);
  }

  /** Brew what you roasted: jump to Brew with that roast on the Profile tab. */
  function brewRoast(attach: BrewAttach) {
    setBrewAttach(attach);
    setBrewSource("profile");
    go("brew");
  }

  const roast = mode === "roast";
  const roaster = roasterById(roasterId);

  if (mode == null) {
    return (
      <Welcome
        onDone={(next, rid) => {
          if (rid) pickRoaster(rid);
          go(next, "studio");
        }}
      />
    );
  }

  function saveCurrent() {
    const generated = generateProfile(intent);
    const item = savedFromGenerated(generated.kproText, intent, generated.curveName, generated.profile, savedId);
    setLibrary(upsertProfile(item));
    setSavedId(item.id);
    setRoastRoute("library");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <header className="sticky top-0 z-20 w-full border-b border-line bg-ink/90 backdrop-blur">
        <div className="flex items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <img src="./icons/icon.svg" alt="" className="h-8 w-8 shrink-0 rounded-xl" />
            <div className="min-w-0">
              <div className="text-[17px] font-semibold leading-none">Kaffe</div>
              <div className="truncate text-[11px] text-muted">
                <span className="hidden sm:inline">{t("brand.tagline")} · </span>v{__APP_VERSION__}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <SectionSwitch mode={mode} onChange={(m) => go(m)} />
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            {import.meta.env.DEV && (
              <span className="hidden rounded-lg bg-card2 px-2 py-1 text-[11px] text-orange lg:inline">Local AI</span>
            )}
            <InstallButton />
            <div className="hidden sm:block">
              <LocaleSwitch />
            </div>
            <AppMenu roaster={roasterId} onRoaster={pickRoaster} onWelcome={() => {
              clearMode();
              setMode(null);
            }} />
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <SectionSwitch mode={mode} onChange={(m) => go(m)} full />
        </div>
        {roast && (
          <div className="hidden items-center justify-between gap-3 border-t border-line/60 px-4 py-2 md:flex">
            <nav className="flex gap-1 rounded-xl bg-card p-1">
              <NavButton active={roastRoute === "studio"} onClick={() => setRoastRoute("studio")}>
                {t("nav.generate")}
              </NavButton>
              <NavButton active={roastRoute === "overlay"} onClick={() => setRoastRoute("overlay")}>
                {t("nav.overlay")}
              </NavButton>
              <NavButton active={roastRoute === "library"} onClick={() => setRoastRoute("library")}>
                {t("nav.library")}
              </NavButton>
            </nav>
            <label className="flex items-center gap-2 text-[13px] text-muted">
              {t("roaster.label")}
              <span className="flex items-center gap-1 rounded-lg bg-card px-2.5 py-1.5">
                <RoasterSelect value={roasterId} onChange={pickRoaster} />
                <span className="text-[11px]" aria-hidden="true">▾</span>
              </span>
            </label>
          </div>
        )}
      </header>

      <main
        className={`flex min-h-0 flex-1 flex-col md:pb-0 ${
          roast ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))]" : "pb-[env(safe-area-inset-bottom)]"
        }`}
      >
        {roast && roastRoute === "studio" && (
          <Studio
            intent={intent}
            setIntent={(next) => {
              setIntent(next);
              setSavedId(undefined);
            }}
            tab={studioTab}
            setTab={setStudioTab}
            onSave={saveCurrent}
            onBrew={() => brewRoast({ kind: "generate" })}
            roaster={roaster}
            roasterSelect={<RoasterSelect value={roasterId} onChange={pickRoaster} className="max-w-[220px] text-right" />}
          />
        )}
        <div className={roast && roastRoute === "overlay" ? undefined : "hidden"}>
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
              setRoastRoute("studio");
              setStudioTab("parameters");
            }}
            studioIntent={intent}
          />
        </div>
        {roast && roastRoute === "library" && (
          <LibraryPage
            items={library}
            onOpen={(item, openMode) => {
              setIntent(intentFromSaved(item));
              setSavedId(openMode === "edit" ? item.id : undefined);
              setRoastRoute("studio");
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
            onBrew={(item) => brewRoast({ kind: "library", id: item.id })}
          />
        )}
        <div className={roast ? "hidden" : undefined}>
          <BrewPage
            attach={brewAttach}
            setAttach={setBrewAttach}
            source={brewSource}
            setSource={setBrewSource}
            studioIntent={intent}
            library={library}
          />
        </div>
      </main>

      {roast && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 px-2 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-md justify-around">
            <TabIcon label={t("nav.generate")} active={roastRoute === "studio"} onClick={() => setRoastRoute("studio")}>
              <path d="M4 7h16M4 12h16M4 17h16M8 4.5v5M15 9.5v5M10 14.5v5" />
            </TabIcon>
            <TabIcon label={t("nav.overlay")} active={roastRoute === "overlay"} onClick={() => setRoastRoute("overlay")}>
              <rect x="3.5" y="7.5" width="11" height="11" rx="1.5" />
              <rect x="9.5" y="3.5" width="11" height="11" rx="1.5" />
            </TabIcon>
            <TabIcon label={t("nav.library")} active={roastRoute === "library"} onClick={() => setRoastRoute("library")}>
              <rect x="6" y="4" width="12" height="16" rx="1.5" />
              <path d="M9 9h6M9 13h6" />
            </TabIcon>
          </div>
        </nav>
      )}
    </div>
  );
}

function SectionSwitch({ mode, onChange, full = false }: { mode: AppMode; onChange: (m: AppMode) => void; full?: boolean }) {
  const { t } = useI18n();
  const items: [AppMode, string, ReactNode][] = [
    ["brew", t("mode.brew"), <CupGlyph key="c" />],
    ["roast", t("mode.roast"), <BeanGlyph key="b" />],
  ];
  return (
    <div
      className={`rounded-xl bg-card p-1 ${full ? "grid w-full grid-cols-2" : "flex shrink-0"}`}
      role="tablist"
      aria-label={t("mode.label")}
    >
      {items.map(([id, label, glyph]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          title={label}
          onClick={() => mode !== id && onChange(id)}
          className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold ${
            full ? "px-3 py-2 text-[14px]" : "px-2.5 py-1.5 text-[13px]"
          } ${mode === id ? "bg-card2 text-white" : "text-muted"}`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${mode === id ? "text-blue" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {glyph}
          </svg>
          <span>{label}</span>
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
