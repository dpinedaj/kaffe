import { defaultIntent, type RoastIntent } from "./generate";
import { parseKpro, type KproProfile } from "./kpro";

export interface SavedProfile {
  id: string;
  name: string;
  favorite: boolean;
  createdAt: string;
  kproText: string;
  intent: RoastIntent;
  curveName: string;
}

const KEY = "kaffe.library.v1";

export function loadLibrary(): SavedProfile[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLibrary(items: SavedProfile[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function upsertProfile(item: SavedProfile): SavedProfile[] {
  const items = loadLibrary();
  const idx = items.findIndex((p) => p.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  saveLibrary(items);
  return items;
}

export function removeProfile(id: string): SavedProfile[] {
  const items = loadLibrary().filter((p) => p.id !== id);
  saveLibrary(items);
  return items;
}

export function newSavedId(): string {
  return crypto.randomUUID();
}

export function savedFromGenerated(
  kproText: string,
  intent: RoastIntent,
  curveName: string,
  profile: KproProfile,
  existingId?: string,
): SavedProfile {
  return {
    id: existingId ?? newSavedId(),
    name: profile.name,
    favorite: false,
    createdAt: new Date().toISOString(),
    kproText,
    intent,
    curveName,
  };
}

/** Restore bean settings and the exact saved curve so Generate can edit or fork it. */
export function intentFromSaved(item: SavedProfile): RoastIntent {
  const fallback = defaultIntent();
  const intent: RoastIntent = {
    ...fallback,
    ...item.intent,
    originId: item.intent?.originId || fallback.originId,
    varietyId: item.intent?.varietyId || fallback.varietyId,
    flavors: item.intent?.flavors ?? [],
  };
  try {
    const profile = parseKpro(item.kproText, `${item.name}.kpro`);
    if (profile.roast.anchors.length >= 3) {
      intent.manualAnchors = profile.roast.anchors.map((p) => ({ t: p.t, v: p.v }));
    }
  } catch {
    /* keep whatever anchors were stored on the intent */
  }
  return intent;
}
