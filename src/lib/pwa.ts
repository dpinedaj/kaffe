/** Install prompt + service-worker update state, shared by the header button. */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PwaState {
  canPrompt: boolean;
  installed: boolean;
  updateReady: boolean;
  /** Chrome / Edge / other Chromium: installs only through the browser's own prompt. */
  chromium: boolean;
}

export type InstallHelp =
  | "ios"
  | "iosChrome"
  | "iosEdge"
  | "iosFirefox"
  | "iosInApp"
  | "macSafari"
  | "firefox"
  | "androidFirefox"
  | "other";

/** Apps whose built-in browser has no “Add to Home Screen” (the page must be opened in a real browser). */
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|MicroMessenger|Snapchat|TikTok|musical_ly|Twitter|GSA\//;

let deferred: InstallPromptEvent | null = null;
let installedElsewhere = false;
let waiting: ServiceWorker | null = null;
const listeners = new Set<(s: PwaState) => void>();

function standalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  const modes = ["standalone", "window-controls-overlay", "minimal-ui", "fullscreen"];
  return modes.some((m) => window.matchMedia?.(`(display-mode: ${m})`).matches) || nav.standalone === true;
}

/**
 * Chromium fires `beforeinstallprompt` only when the site is installable and not
 * installed yet, so without that event there is nothing to install — the app is
 * already on this machine (or the browser cannot install it).
 */
function isChromium(): boolean {
  if (typeof navigator === "undefined") return false;
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
  return Array.isArray(brands) && brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand));
}

/**
 * Which install steps to show. iOS has no install API in any browser: every iOS
 * browser adds to the Home Screen through its own Share sheet, so the steps name
 * where Share lives in that browser.
 */
export function installHelp(ua = navigator.userAgent, ios = isIos()): InstallHelp {
  if (ios) {
    if (IN_APP.test(ua)) return "iosInApp";
    if (/CriOS\//.test(ua)) return "iosChrome";
    if (/EdgiOS\//.test(ua)) return "iosEdge";
    if (/FxiOS\//.test(ua)) return "iosFirefox";
    return "ios";
  }
  if (/Android/.test(ua) && /Firefox\//.test(ua)) return "androidFirefox";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return "macSafari";
  return "other";
}

/** Chrome on Android / desktop can tell a browser tab that this PWA is already installed. */
async function checkInstalled(): Promise<void> {
  const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
  if (!nav.getInstalledRelatedApps) return;
  try {
    const apps = await nav.getInstalledRelatedApps();
    if (apps.length > 0) {
      installedElsewhere = true;
      emit();
    }
  } catch {
    /* not supported here */
  }
}

export function pwaState(): PwaState {
  return {
    canPrompt: deferred != null,
    installed: standalone() || installedElsewhere,
    updateReady: waiting != null,
    chromium: isChromium(),
  };
}

function emit() {
  const s = pwaState();
  listeners.forEach((fn) => fn(s));
}

export function subscribePwa(fn: (s: PwaState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  await ev.prompt();
  const choice = await ev.userChoice.catch(() => ({ outcome: "dismissed" as const }));
  emit();
  return choice.outcome === "accepted";
}

export function applyUpdate(): void {
  if (!waiting) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
  waiting.postMessage("skip-waiting");
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function initPwa(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedElsewhere = true;
    emit();
  });
  void checkInstalled();
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        const track = (sw: ServiceWorker | null) => {
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              waiting = sw;
              emit();
            }
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) {
          waiting = reg.waiting;
          emit();
        }
        reg.addEventListener("updatefound", () => track(reg.installing));
      })
      .catch(() => {
        /* offline install unavailable; the app still works online */
      });
  });
}
