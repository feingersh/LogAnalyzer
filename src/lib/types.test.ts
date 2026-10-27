import { REGIONS } from "./types";

describe("REGIONS", () => {
  it("lists US, EU, KR and TW", () => {
    expect(REGIONS.map((r) => r.slug)).toEqual(["US", "EU", "KR", "TW"]);
  });

  it("uses the WarcraftLogs region ids 1 to 4", () => {
    expect(REGIONS.map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });
});
