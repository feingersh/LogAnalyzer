import { classifyReport } from "./classify";

describe("classifyReport", () => {
  it("treats a fight with a keystone level as Mythic+", () => {
    expect(classifyReport("Some Dungeon", [{ keystoneLevel: 10, size: 5 }])).toBe("mythic-plus");
  });

  it("uses the zone name when there are no fights", () => {
    expect(classifyReport("Mythic+ Season 3", [])).toBe("mythic-plus");
  });

  it("treats 10 or more participants as a raid", () => {
    expect(classifyReport("The Venomous Abyss", [{ keystoneLevel: null, size: 20 }])).toBe("raid");
  });

  it("treats a 5-player group without a keystone as a dungeon", () => {
    expect(classifyReport("Some Dungeon", [{ keystoneLevel: null, size: 5 }])).toBe("mythic-plus");
  });

  it("uses the largest fight when sizes are mixed", () => {
    const fights = [
      { keystoneLevel: null, size: 3 },
      { keystoneLevel: null, size: 25 },
    ];
    expect(classifyReport(null, fights)).toBe("raid");
  });

  it("returns other when nothing identifies the report", () => {
    expect(classifyReport(null, null)).toBe("other");
    expect(classifyReport(null, [{ keystoneLevel: null, size: 7 }])).toBe("other");
  });
});
