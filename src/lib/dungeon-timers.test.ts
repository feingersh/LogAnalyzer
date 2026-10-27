import { dungeonKey, timersFromStaticData } from "./dungeon-timers";

describe("dungeonKey", () => {
  it("ignores case, punctuation and a leading The", () => {
    expect(dungeonKey("The MOTHERLODE!!")).toBe(dungeonKey("Motherlode!!"));
    expect(dungeonKey("Ara-Kara, City of Echoes")).toBe("arakaracityofechoes");
    expect(dungeonKey("Kings' Rest")).toBe(dungeonKey("kings rest"));
  });
});

describe("timersFromStaticData", () => {
  it("converts to milliseconds, lets later expansions win and tolerates failed loads", () => {
    const timers = timersFromStaticData([
      { seasons: [{ dungeons: [{ name: "Old Dungeon", keystone_timer_seconds: 1800 }] }] },
      null,
      { seasons: [{ dungeons: [{ name: "Old Dungeon", keystone_timer_seconds: 1900 }, { name: "Bad", keystone_timer_seconds: 0 }] }] },
    ]);

    expect(timers.get(dungeonKey("Old Dungeon"))).toBe(1900000);
    expect(timers.has(dungeonKey("Bad"))).toBe(false);
  });
});
