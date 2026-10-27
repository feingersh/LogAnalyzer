import type { ReportKind } from "./types";

export interface FightInfo {
  keystoneLevel: number | null;
  size: number | null;
}

/**
 * WarcraftLogs has no report-level "type", so derive it: a keystone level marks
 * Mythic+, then the zone name, then the number of participating characters
 * (a dungeon party is 5, a raid is 10 or more).
 */
export function classifyReport(zoneName: string | null, fights: FightInfo[] | null): ReportKind {
  const list = fights ?? [];
  if (list.some((f) => (f.keystoneLevel ?? 0) > 0)) return "mythic-plus";
  if (zoneName && /mythic\+/i.test(zoneName)) return "mythic-plus";

  const maxSize = Math.max(0, ...list.map((f) => f.size ?? 0));
  if (maxSize >= 10) return "raid";
  if (maxSize > 0 && maxSize <= 5) return "mythic-plus";
  return "other";
}
