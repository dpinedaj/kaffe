import { roasterById, type RoasterId } from "./roasters";

/** Brew = cards for any coffee. Roast = profile design for your roaster, then brew. */
export type AppMode = "brew" | "roast";

const MODE_KEY = "kaffe.mode";
const ROASTER_KEY = "kaffe.roaster";

function read(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

/** People who used Kaffe before modes existed already roast with it — keep them in Roast, no welcome. */
function hasRoastHistory(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const lib = localStorage.getItem("kaffe.library.v1");
    return lib != null && lib !== "[]";
  } catch {
    return false;
  }
}

export function loadMode(): AppMode | null {
  const raw = read(MODE_KEY);
  if (raw === "brew" || raw === "roast") return raw;
  return hasRoastHistory() ? "roast" : null;
}

export function saveMode(mode: AppMode): void {
  write(MODE_KEY, mode);
}

export function loadRoaster(): RoasterId {
  return roasterById(read(ROASTER_KEY) ?? undefined).id;
}

export function saveRoaster(id: RoasterId): void {
  write(ROASTER_KEY, id);
}
