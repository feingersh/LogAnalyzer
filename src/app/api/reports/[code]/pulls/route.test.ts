import { GET } from "./route";
import { wclQuery } from "@/lib/wcl";

jest.mock("@/lib/wcl");
const wclQueryMock = jest.mocked(wclQuery);

const CODE = "aBcD1234eFgH5678";

function get(code: string, fight?: string) {
  const qs = fight === undefined ? "" : `?fight=${fight}`;
  return GET(new Request(`http://localhost/api/reports/${code}/pulls${qs}`), {
    params: Promise.resolve({ code }),
  });
}

beforeEach(() => wclQueryMock.mockReset());

describe("GET /api/reports/[code]/pulls", () => {
  it("returns 400 for a malformed code or a bad fight id", async () => {
    expect((await get("nope", "1")).status).toBe(400);
    expect((await get(CODE)).status).toBe(400);
    expect((await get(CODE, "abc")).status).toBe(400);
    expect((await get(CODE, "0")).status).toBe(400);
    expect(wclQueryMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the fight is not in the report", async () => {
    wclQueryMock.mockResolvedValue({ reportData: { report: { masterData: null, fights: [] } } });

    expect((await get(CODE, "9")).status).toBe(404);
  });

  it("returns the normalized route with NPC names", async () => {
    wclQueryMock.mockResolvedValue({
      reportData: {
        report: {
          masterData: { actors: [{ gameID: 10, name: "Big Mob" }] },
          fights: [
            {
              id: 6,
              name: "The Blinding Vale",
              keystoneLevel: 17,
              startTime: 1000,
              countRequired: 100,
              countReached: 105,
              npcCountMap: { "10": 5 },
              gameZone: { id: 2859 },
              dungeonPulls: [
                {
                  id: 1,
                  name: null,
                  encounterID: 0,
                  startTime: 2000,
                  endTime: 4000,
                  x: 5,
                  y: 6,
                  maps: [{ id: 2500 }],
                  boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
                  enemyNPCs: [{ gameID: 10, minimumInstanceID: 1, maximumInstanceID: 3 }],
                },
              ],
            },
          ],
        },
      },
    });

    const res = await get(CODE, "6");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ fightId: 6, zoneId: 2859, countRequired: 100 });
    expect(body.pulls[0]).toMatchObject({
      startTime: 1000,
      mapId: 2500,
      forces: 15,
      enemies: [{ name: "Big Mob", count: 3, forces: 15 }],
    });
    expect(wclQueryMock).toHaveBeenCalledWith(expect.any(String), { code: CODE, fight: 6 }, 300);
  });

  it("returns 502 when WarcraftLogs fails", async () => {
    wclQueryMock.mockRejectedValue(new Error("boom"));

    const res = await get(CODE, "6");

    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("boom");
  });
});
