export const REGIONS = [
  { slug: "US", id: 1, name: "United States" },
  { slug: "EU", id: 2, name: "Europe" },
  { slug: "KR", id: 3, name: "Korea" },
  { slug: "TW", id: 4, name: "Taiwan" },
] as const;

export type RegionSlug = (typeof REGIONS)[number]["slug"];

export interface Server {
  name: string;
  slug: string;
}

/** A character found by name when no server was chosen. */
export interface CharacterMatch {
  name: string;
  classId: number | null;
  region: RegionSlug;
  serverName: string;
  serverSlug: string;
}

export type ReportKind = "mythic-plus" | "raid" | "other";

export interface ReportSummary {
  code: string;
  title: string;
  startTime: number;
  endTime: number;
  zone: string | null;
  zoneId: number | null;
  guild: string | null;
  kind: ReportKind;
}

export interface ReportEncounter {
  id: number;
  encounterId: number;
  name: string;
  kill: boolean | null;
  difficulty: number | null;
  startTime: number;
  endTime: number;
  fightPercentage: number | null;
  keystoneLevel: number | null;
  keystoneTime: number | null;
}

export interface PullEnemy {
  npcId: number;
  name: string;
  count: number;
  /** Enemy forces these mobs add to the key (count x per-mob value). */
  forces: number;
}

export interface DungeonPull {
  id: number;
  /** Lead enemy of the pull as named by WarcraftLogs. */
  name: string;
  boss: boolean;
  /** Milliseconds from the start of the run. */
  startTime: number;
  endTime: number;
  mapId: number | null;
  x: number | null;
  y: number | null;
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number } | null;
  enemies: PullEnemy[];
  forces: number;
}

export interface DungeonRoute {
  fightId: number;
  zoneId: number | null;
  dungeon: string;
  keystoneLevel: number | null;
  countRequired: number | null;
  countReached: number | null;
  pulls: DungeonPull[];
}

export interface ReportDetail {
  code: string;
  title: string;
  encounters: ReportEncounter[];
}

export interface CharacterReports {
  name: string;
  /** WarcraftLogs class id, used to colour the character's name. */
  classId: number | null;
  reports: ReportSummary[];
}
