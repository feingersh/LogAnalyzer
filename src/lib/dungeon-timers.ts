import "server-only";

// WarcraftLogs doesn't expose the timer a key had to beat, so it comes from Raider.IO's static data.
// Timers don't change between seasons, so every expansion since Battle for Azeroth is merged by name.
const STATIC_DATA_URL = "https://raider.io/api/v1/mythic-plus/static-data";
const FIRST_EXPANSION = 7;
const LAST_EXPANSION = 12;

interface StaticData {
  seasons?: { dungeons?: { name: string; keystone_timer_seconds: number }[] }[];
}

/** Lookup key for a dungeon name: ignores case, punctuation and a leading "The". */
export function dungeonKey(name: string): string {
  return name.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");
}

/** Timer in milliseconds by `dungeonKey`; later expansions override earlier ones. */
export function timersFromStaticData(responses: (StaticData | null)[]): Map<string, number> {
  const timers = new Map<string, number>();
  for (const data of responses) {
    for (const season of data?.seasons ?? []) {
      for (const d of season.dungeons ?? []) {
        if (d.keystone_timer_seconds > 0) timers.set(dungeonKey(d.name), d.keystone_timer_seconds * 1000);
      }
    }
  }
  return timers;
}

/** Key timers by dungeon, cached for a day. Best effort: an expansion that fails to load is skipped. */
export async function fetchDungeonTimers(): Promise<Map<string, number>> {
  const ids = Array.from({ length: LAST_EXPANSION - FIRST_EXPANSION + 1 }, (_, i) => FIRST_EXPANSION + i);
  const responses = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`${STATIC_DATA_URL}?expansion_id=${id}`, { next: { revalidate: 86400 } });
        return res.ok ? ((await res.json()) as StaticData) : null;
      } catch {
        return null;
      }
    }),
  );
  return timersFromStaticData(responses);
}
