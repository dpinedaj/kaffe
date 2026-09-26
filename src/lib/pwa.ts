/** Install prompt + service-worker update state, shared by the header button. */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PwaState {
  canPrompt: boolean;
  installed: boolean;
  updateReady: boolean;
}

let deferred: InstallPromptEvent | null = null;
let waiting: ServiceWorker | null = null;
const listeners = new Set<(s: PwaState) => void>();

function standalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

export function pwaState(): PwaState {
  return { canPrompt: deferred != null, installed: standalone(), updateReady: waiting != null };
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
    emit();
  });
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
