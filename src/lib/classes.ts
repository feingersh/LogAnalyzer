/**
 * WoW classes keyed by WarcraftLogs `classID`, with the standard in-game class colour.
 * WarcraftLogs numbers classes alphabetically (1 = Death Knight), which is NOT Blizzard's class id order
 * (and not Raider.IO's, which follows Blizzard). Verified against `gameData { classes { id name } }`.
 * `slug` is the kebab-case class name Raider.IO uses, for translating its results.
 */
const CLASSES = [
  { id: 1, slug: "death-knight", color: "#C41E3A" },
  { id: 2, slug: "druid", color: "#FF7C0A" },
  { id: 3, slug: "hunter", color: "#AAD372" },
  { id: 4, slug: "mage", color: "#3FC7EB" },
  { id: 5, slug: "monk", color: "#00FF98" },
  { id: 6, slug: "paladin", color: "#F48CBA" },
  { id: 7, slug: "priest", color: "#FFFFFF" },
  { id: 8, slug: "rogue", color: "#FFF468" },
  { id: 9, slug: "shaman", color: "#0070DD" },
  { id: 10, slug: "warlock", color: "#8788EE" },
  { id: 11, slug: "warrior", color: "#C69B6D" },
  { id: 12, slug: "demon-hunter", color: "#A330C9" },
  { id: 13, slug: "evoker", color: "#33937F" },
] as const;

export function classColor(classId: number | null | undefined): string | undefined {
  return CLASSES.find((c) => c.id === classId)?.color;
}

/** WarcraftLogs class id for a kebab-case class name such as "death-knight", or null if unknown. */
export function classIdFromSlug(slug: string | null | undefined): number | null {
  return CLASSES.find((c) => c.slug === slug)?.id ?? null;
}
