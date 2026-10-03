/**
 * Roasters Kaffe can design profiles for. Only Kaffelogic Nano 7 today; a new machine
 * is a new entry plus its profile / log format — not a rewrite of the roast model.
 * Profile translation between roasters is intentionally not built yet: machines differ
 * in heat transfer, probe placement, load and control, so it needs logs from both.
 */
export type RoasterId = "kaffelogic-nano7";

export interface RoasterInfo {
  id: RoasterId;
  brand: string;
  model: string;
  /** Profile file the roaster loads. */
  profileExt: string;
  /** Roast log it writes. */
  logExt: string;
  capacityG: [number, number];
  heat: "fluid-bed" | "drum";
}

export const ROASTERS: RoasterInfo[] = [
  {
    id: "kaffelogic-nano7",
    brand: "Kaffelogic",
    model: "Nano 7",
    profileExt: ".kpro",
    logExt: ".klog",
    capacityG: [50, 120],
    heat: "fluid-bed",
  },
];

export function roasterById(id: string | undefined): RoasterInfo {
  return ROASTERS.find((r) => r.id === id) ?? ROASTERS[0];
}

export function roasterName(r: RoasterInfo): string {
  return `${r.brand} ${r.model}`;
}
