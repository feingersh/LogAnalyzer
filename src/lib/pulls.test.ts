import { toDungeonRoute, type RawKeystoneFight, type RawPull } from "./pulls";
import { fitBounds, findDungeonMap, toMapFraction } from "./dungeon-maps";

const box = { minX: 0, maxX: 10, minY: 0, maxY: 10 };

function pull(overrides: Partial<RawPull>): RawPull {
  return {
    id: 1,
    name: null,
    encounterID: 0,
    startTime: 1000,
    endTime: 2000,
    x: 5,
    y: 5,
    maps: [{ id: 2500 }],
    boundingBox: box,
    enemyNPCs: [],
    ...overrides,
  };
}

function fight(pulls: RawPull[]): RawKeystoneFight {
  return {
    id: 6,
    name: "The Blinding Vale",
    keystoneLevel: 17,
    startTime: 1000,
    countRequired: 100,
    countReached: 105,
    npcCountMap: { "10": 5, "20": 1 },
    gameZone: { id: 2859 },
    dungeonPulls: pulls,
  };
}

const actors = [
  { gameID: 10, name: "Big Mob" },
  { gameID: 20, name: "Small Mob" },
];

describe("toDungeonRoute", () => {
  it("makes pull times relative to the start of the run and sorts them", () => {
    const route = toDungeonRoute(
      fight([pull({ id: 2, startTime: 5000, endTime: 6000 }), pull({ id: 1, startTime: 1500, endTime: 3000 })]),
      actors,
    );

    expect(route.pulls.map((p) => [p.id, p.startTime, p.endTime])).toEqual([
      [1, 500, 2000],
      [2, 4000, 5000],
    ]);
    expect(route).toMatchObject({ fightId: 6, zoneId: 2859, dungeon: "The Blinding Vale", keystoneLevel: 17 });
  });

  it("counts mobs from the instance range and computes enemy forces", () => {
    const route = toDungeonRoute(
      fight([
        pull({
          enemyNPCs: [
            { gameID: 20, minimumInstanceID: 1, maximumInstanceID: 7 },
            { gameID: 10, minimumInstanceID: 2, maximumInstanceID: 3 },
          ],
        }),
      ]),
      actors,
    );

    const [p] = route.pulls;
    expect(p.enemies).toEqual([
      { npcId: 10, name: "Big Mob", count: 2, forces: 10 },
      { npcId: 20, name: "Small Mob", count: 7, forces: 7 },
    ]);
    expect(p.forces).toBe(17);
    expect(p.name).toBe("Big Mob");
  });

  it("marks encounter pulls as bosses and keeps the WCL name", () => {
    const route = toDungeonRoute(fight([pull({ encounterID: 3200, name: "Ikuzz" })]), actors);

    expect(route.pulls[0]).toMatchObject({ boss: true, name: "Ikuzz" });
  });

  it("ignores sentinel coordinates, falling back to the bounding box center", () => {
    const route = toDungeonRoute(fight([pull({ x: -2147483648, y: -2147483648 })]), actors);

    expect(route.pulls[0]).toMatchObject({ x: 5, y: 5 });
  });

  it("drops an invalid bounding box and leaves the position empty when nothing is valid", () => {
    const bad = { minX: -2147483648, maxX: 2147483647, minY: -2147483648, maxY: 2147483647 };
    const route = toDungeonRoute(fight([pull({ x: null, y: null, boundingBox: bad })]), actors);

    expect(route.pulls[0]).toMatchObject({ x: null, y: null, boundingBox: null });
  });

  it("handles a fight without pull data", () => {
    const route = toDungeonRoute({ ...fight([]), dungeonPulls: null, npcCountMap: null }, []);

    expect(route.pulls).toEqual([]);
  });
});

describe("dungeon maps", () => {
  it("finds a calibrated map by zone and map id", () => {
    expect(findDungeonMap(2859, 2500)?.image).toBe("/maps/2859-0.jpg");
    expect(findDungeonMap(2859, 1)).toBeUndefined();
    expect(findDungeonMap(null, null)).toBeUndefined();
  });

  it("converts world coordinates to image fractions with y pointing up", () => {
    const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 50 };

    expect(toMapFraction(bounds, 25, 10)).toEqual({ fx: 0.25, fy: 0.8 });
  });

  it("clamps coordinates outside the bounds", () => {
    const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 50 };

    expect(toMapFraction(bounds, -50, 500)).toEqual({ fx: 0, fy: 0 });
  });

  it("fits points into the middle of an image at a uniform scale", () => {
    const bounds = fitBounds([{ x: 0, y: 0 }, { x: 10000, y: 5000 }], 1000, 500);

    const a = toMapFraction(bounds, 0, 0);
    const b = toMapFraction(bounds, 10000, 5000);
    expect(a.fx).toBeCloseTo(0.1);
    expect(b.fx).toBeCloseTo(0.9);
    expect((b.fx - a.fx) * 1000).toBeCloseTo((a.fy - b.fy) * 500 * 2);
  });

  it("copes with a single point", () => {
    const bounds = fitBounds([{ x: 10, y: 10 }], 1000, 500);

    expect(toMapFraction(bounds, 10, 10)).toEqual({ fx: 0.5, fy: 0.5 });
  });
});
