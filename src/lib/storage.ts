import type { KproProfile } from "./kpro";
import type { RoastIntent } from "./generate";

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
