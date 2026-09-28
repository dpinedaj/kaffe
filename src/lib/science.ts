/** Opens the “How Kaffe works” page from anywhere (menu, “Why?” links). */
export type ScienceTarget = { topic?: "brew" | "roast"; section?: string };

const EVENT = "kaffe:science";

export function openScience(target: ScienceTarget = {}): void {
  window.dispatchEvent(new CustomEvent<ScienceTarget>(EVENT, { detail: target }));
}

export function onOpenScience(handler: (target: ScienceTarget) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<ScienceTarget>).detail ?? {});
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
