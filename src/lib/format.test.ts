import { difficultyName, formatDuration } from "./format";

describe("difficultyName", () => {
  it("names the known raid difficulties", () => {
    expect(difficultyName(3)).toBe("Normal");
    expect(difficultyName(4)).toBe("Heroic");
    expect(difficultyName(5)).toBe("Mythic");
  });

  it("returns null for missing or unknown difficulties", () => {
    expect(difficultyName(null)).toBeNull();
    expect(difficultyName(99)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats milliseconds as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(1_805_400)).toBe("30:05");
  });
});
