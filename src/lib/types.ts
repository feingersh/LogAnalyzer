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
  /** Timer the key had to beat, in milliseconds, when the dungeon is known. */
  keystoneLimit: number | null;
}

export interface PullEnemy {
  npcId: number;
  name: string;
  count: number;
  /** Enemy forces these mobs add to the key (count x per-mob value). */
  forces: number;
}

export interface RoutePlayer {
  name: string;
  classId: number | null;
}

export interface GroupMember extends RoutePlayer {
  /** Raider.IO profile, or null when the realm is unknown. */
  profileUrl: string | null;
  /** Spec icon image, or null when the spec is unknown. */
  specIcon: string | null;
  /** Role derived from the spec, or null when the spec is unknown. */
  role: Role | null;
}

export type Role = "tank" | "healer" | "dps";

export interface PullDeath extends RoutePlayer {
  /** Milliseconds into the run. */
  time: number;
  /** Milliseconds this death adds to the run. */
  penalty: number;
  /** Total time lost to deaths in the run so far, including this one. */
  timeLost: number;
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
  deaths: PullDeath[];
  /** Pull start/end in milliseconds from the start of the report, for linking to WarcraftLogs. */
  reportStart: number;
  reportEnd: number;
}

export interface DungeonRoute {
  fightId: number;
  players: GroupMember[];
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
