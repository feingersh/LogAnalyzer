import { classIdFromName } from "./classes";
import type { DungeonPull, DungeonRoute, PullEnemy, Role } from "./types";

const realmKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Raider.IO realm slug for a realm as WarcraftLogs spells it ("TarrenMill", "Tarren Mill", "tarren-mill").
 * Matches against the region's known servers; an unknown realm falls back to a plain kebab-case slug.
 */
export function resolveRealmSlug(server: string, known: { name: string; slug: string }[]): string {
  const key = realmKey(server);
  const hit = known.find((s) => realmKey(s.slug) === key || realmKey(s.name) === key);
  return hit?.slug ?? server.trim().toLowerCase().replace(/['’]/g, "").replace(/\s+/g, "-");
}

export function raiderIoUrl(region: string, realmSlug: string, name: string): string {
  return `https://raider.io/characters/${region.toLowerCase()}/${realmSlug}/${encodeURIComponent(name)}`;
}

/** Link to a stretch of a fight on WarcraftLogs; times are milliseconds from the start of the report. */
export function wclPullUrl(code: string, fightId: number, start: number, end: number): string {
  return `https://www.warcraftlogs.com/reports/${code}?fight=${fightId}&type=damage-done&start=${start}&end=${end}`;
}

interface RawBoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface RawPull {
  id: number;
  name: string | null;
  encounterID: number | null;
  startTime: number;
  endTime: number;
  x: number | null;
  y: number | null;
  maps: { id: number }[] | null;
  boundingBox: RawBoundingBox | null;
  enemyNPCs: { gameID: number; minimumInstanceID: number; maximumInstanceID: number }[] | null;
}

export interface RawKeystoneFight {
  id: number;
  name: string;
  keystoneLevel: number | null;
  startTime: number;
  countRequired: number | null;
  countReached: number | null;
  /** Enemy forces per mob, keyed by NPC game id. */
  npcCountMap: Record<string, number> | null;
  gameZone: { id: number } | null;
  /** Actor ids of the players in the run. */
  friendlyPlayers: number[] | null;
  dungeonPulls: RawPull[] | null;
}

export interface RawPlayer {
  id: number;
  name: string;
  /** Class name without spaces, e.g. "DeathKnight". */
  subType: string | null;
  /** Raider.IO realm slug (see resolveRealmSlug). Players in a group can come from different realms. */
  server: string | null;
  /** WarcraftLogs icon key for the player's spec in this run, e.g. "Priest-Holy". */
  spec?: string | null;
}

interface RawDetailsPlayer {
  id: number;
  type?: string;
  icon?: string;
  specs?: { spec: string }[];
}

/**
 * Spec icon key (e.g. "DeathKnight-Blood") per actor id, from a report's `playerDetails` JSON,
 * which groups players into tanks, healers and dps.
 */
export function specsFromPlayerDetails(json: unknown): Map<number, string> {
  const groups = (json as { data?: { playerDetails?: Record<string, RawDetailsPlayer[]> } } | null)?.data
    ?.playerDetails;
  const specs = new Map<number, string>();
  for (const player of Object.values(groups ?? {}).flat()) {
    const spec = player.specs?.[0]?.spec.replace(/\s+/g, "");
    const key = player.icon ?? (player.type && spec ? `${player.type}-${spec}` : null);
    if (key) specs.set(player.id, key);
  }
  return specs;
}

export function specIconUrl(spec: string): string {
  return `/icons/${encodeURIComponent(spec)}.jpg`;
}

const TANK_SPECS = new Set([
  "DeathKnight-Blood",
  "Druid-Guardian",
  "Warrior-Protection",
  "Paladin-Protection",
  "DemonHunter-Vengeance",
  "Monk-Brewmaster",
]);
const HEALER_SPECS = new Set([
  "Priest-Holy",
  "Paladin-Holy",
  "Shaman-Restoration",
  "Druid-Restoration",
  "Evoker-Preservation",
  "Monk-Mistweaver",
]);

/** Role for a spec icon key (e.g. "Priest-Holy"); every spec that is not a tank or healer is dps. */
export function specRole(spec: string): Role {
  if (TANK_SPECS.has(spec)) return "tank";
  if (HEALER_SPECS.has(spec)) return "healer";
  return "dps";
}

export interface RawDeath {
  /** Milliseconds from the start of the report. */
  timestamp: number;
  targetID: number;
}

// WarcraftLogs fills missing coordinates with the 32-bit integer limits.
const isValidCoordinate = (v: number | null): v is number => v !== null && Math.abs(v) < 1e9;

function validBox(box: RawBoundingBox | null) {
  if (!box) return null;
  const values = [box.minX, box.maxX, box.minY, box.maxY];
  return values.every(isValidCoordinate) ? box : null;
}

function toPull(
  raw: RawPull,
  fightStart: number,
  names: Map<number, string>,
  forcesPerMob: Record<string, number>,
): DungeonPull {
  const enemies: PullEnemy[] = (raw.enemyNPCs ?? []).map((n) => {
    // Instance ids run from minimum to maximum; treat that span as the mob count.
    const count = n.maximumInstanceID - n.minimumInstanceID + 1;
    return {
      npcId: n.gameID,
      name: names.get(n.gameID) ?? `NPC ${n.gameID}`,
      count,
      forces: count * (forcesPerMob[String(n.gameID)] ?? 0),
    };
  });
  enemies.sort((a, b) => b.forces - a.forces || b.count - a.count);

  const box = validBox(raw.boundingBox);
  const hasPoint = isValidCoordinate(raw.x) && isValidCoordinate(raw.y);
  return {
    id: raw.id,
    name: raw.name ?? enemies[0]?.name ?? "Unknown",
    boss: (raw.encounterID ?? 0) > 0,
    startTime: raw.startTime - fightStart,
    endTime: raw.endTime - fightStart,
    reportStart: raw.startTime,
    reportEnd: raw.endTime,
    deaths: [],
    mapId: raw.maps?.[0]?.id ?? null,
    x: hasPoint ? raw.x : box ? (box.minX + box.maxX) / 2 : null,
    y: hasPoint ? raw.y : box ? (box.minY + box.maxY) / 2 : null,
    boundingBox: box,
    enemies,
    forces: enemies.reduce((sum, e) => sum + e.forces, 0),
  };
}

/** Time added to a timed key per death: 15s from +12, 5s below. */
export function deathPenaltyMs(keystoneLevel: number | null): number {
  return (keystoneLevel ?? 0) >= 12 ? 15_000 : 5_000;
}

export function toDungeonRoute(
  fight: RawKeystoneFight,
  actors: { gameID: number; name: string }[],
  players: RawPlayer[] = [],
  deaths: RawDeath[] = [],
  /** Region slug (e.g. "US") the report was logged in, for building player profile links. */
  region: string | null = null,
): DungeonRoute {
  const names = new Map(actors.map((a) => [a.gameID, a.name]));
  const forcesPerMob = fight.npcCountMap ?? {};
  const pulls = (fight.dungeonPulls ?? [])
    .map((p) => toPull(p, fight.startTime, names, forcesPerMob))
    .sort((a, b) => a.startTime - b.startTime);

  const inRun = new Set(fight.friendlyPlayers ?? []);
  const roster = (players ?? []).filter((p) => inRun.has(p.id));
  const byId = new Map(roster.map((p) => [p.id, { name: p.name, classId: classIdFromName(p.subType) }]));

  // A death belongs to the last pull that had started by then (deaths between pulls count against the
  // pull just finished), and costs a fixed penalty that depends on the key level.
  const penalty = deathPenaltyMs(fight.keystoneLevel);
  let timeLost = 0;
  if (pulls.length) {
    for (const d of [...(deaths ?? [])].sort((a, b) => a.timestamp - b.timestamp)) {
      const who = byId.get(d.targetID);
      if (!who) continue;
      const time = d.timestamp - fight.startTime;
      const pull = [...pulls].reverse().find((p) => p.startTime <= time) ?? pulls[0];
      timeLost += penalty;
      pull.deaths.push({ ...who, time, penalty, timeLost });
    }
  }

  return {
    fightId: fight.id,
    players: roster.map((p) => ({
      ...byId.get(p.id)!,
      profileUrl: region && p.server ? raiderIoUrl(region, p.server, p.name) : null,
      specIcon: p.spec ? specIconUrl(p.spec) : null,
      role: p.spec ? specRole(p.spec) : null,
    })),
    zoneId: fight.gameZone?.id ?? null,
    dungeon: fight.name,
    keystoneLevel: fight.keystoneLevel,
    countRequired: fight.countRequired,
    countReached: fight.countReached,
    pulls,
  };
}
