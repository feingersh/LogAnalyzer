import type { DungeonPull, DungeonRoute, PullEnemy } from "./types";

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
  dungeonPulls: RawPull[] | null;
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
    mapId: raw.maps?.[0]?.id ?? null,
    x: hasPoint ? raw.x : box ? (box.minX + box.maxX) / 2 : null,
    y: hasPoint ? raw.y : box ? (box.minY + box.maxY) / 2 : null,
    boundingBox: box,
    enemies,
    forces: enemies.reduce((sum, e) => sum + e.forces, 0),
  };
}

export function toDungeonRoute(
  fight: RawKeystoneFight,
  actors: { gameID: number; name: string }[],
): DungeonRoute {
  const names = new Map(actors.map((a) => [a.gameID, a.name]));
  const forcesPerMob = fight.npcCountMap ?? {};
  const pulls = (fight.dungeonPulls ?? [])
    .map((p) => toPull(p, fight.startTime, names, forcesPerMob))
    .sort((a, b) => a.startTime - b.startTime);
  return {
    fightId: fight.id,
    zoneId: fight.gameZone?.id ?? null,
    dungeon: fight.name,
    keystoneLevel: fight.keystoneLevel,
    countRequired: fight.countRequired,
    countReached: fight.countReached,
    pulls,
  };
}
