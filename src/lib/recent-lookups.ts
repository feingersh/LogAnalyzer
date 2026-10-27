import { REGIONS, type RegionSlug } from "./types";

export interface RecentLookup {
  region: RegionSlug;
  serverName: string;
  serverSlug: string;
  name: string;
  /** WarcraftLogs class id; absent on entries saved before class colours existed. */
  classId?: number | null;
}

export const RECENT_KEY = "recentLookups";
export const MAX_RECENT = 8;

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

function isRecentLookup(v: unknown): v is RecentLookup {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    REGIONS.some((r) => r.slug === e.region) &&
    typeof e.serverName === "string" &&
    typeof e.serverSlug === "string" &&
    (e.classId == null || typeof e.classId === "number") &&
    typeof e.name === "string" &&
    e.name.trim() !== ""
  );
}

export function loadRecent(storage: ReadStorage): RecentLookup[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isRecentLookup).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecent(storage: WriteStorage, list: RecentLookup[]): void {
  try {
    storage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Storage can be unavailable (private mode) or full; the list is a convenience only.
  }
}

function sameCharacter(a: RecentLookup, b: RecentLookup): boolean {
  return a.region === b.region && a.serverSlug === b.serverSlug && a.name.toLowerCase() === b.name.toLowerCase();
}

/** Puts `entry` first, dropping any earlier copy of the same character, and caps the list. */
export function addRecent(list: RecentLookup[], entry: RecentLookup): RecentLookup[] {
  return [entry, ...list.filter((a) => !sameCharacter(a, entry))].slice(0, MAX_RECENT);
}

export function removeRecent(list: RecentLookup[], entry: RecentLookup): RecentLookup[] {
  return list.filter((a) => !sameCharacter(a, entry));
}
