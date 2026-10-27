const DIFFICULTIES: Record<number, string> = {
  1: "LFR",
  3: "Normal",
  4: "Heroic",
  5: "Mythic",
};

export function difficultyName(difficulty: number | null): string | null {
  return difficulty === null ? null : (DIFFICULTIES[difficulty] ?? null);
}

/** Formats a millisecond duration as m:ss. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const seconds = String(total % 60).padStart(2, "0");
  return `${Math.floor(total / 60)}:${seconds}`;
}
