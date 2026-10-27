import { GET } from "./route";
import { wclQuery } from "@/lib/wcl";

jest.mock("@/lib/wcl");
jest.mock("@/lib/dungeon-timers", () => ({
  ...jest.requireActual("@/lib/dungeon-timers"),
  fetchDungeonTimers: jest.fn(async () => new Map([["arakara", 1800000]])),
}));
const wclQueryMock = jest.mocked(wclQuery);

function get(code: string) {
  return GET(new Request(`http://localhost/api/reports/${code}`), {
    params: Promise.resolve({ code }),
  });
}

const CODE = "aBcD1234eFgH5678";

beforeEach(() => wclQueryMock.mockReset());

describe("GET /api/reports/[code]", () => {
  it("returns 400 for a malformed report code", async () => {
    expect((await get("not a code")).status).toBe(400);
    expect(wclQueryMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the report does not exist", async () => {
    wclQueryMock.mockResolvedValue({ reportData: { report: null } });

    const res = await get(CODE);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain(CODE);
  });

  it("maps fights to encounters", async () => {
    wclQueryMock.mockResolvedValue({
      reportData: {
        report: {
          title: "Tuesday Raid",
          fights: [
            {
              id: 3,
              encounterID: 2902,
              name: "Ulgrax",
              kill: true,
              difficulty: 5,
              startTime: 1000,
              endTime: 241000,
              fightPercentage: 0,
              keystoneLevel: null,
              keystoneTime: null,
            },
            {
              id: 4,
              encounterID: 12660,
              name: "Ara-Kara",
              kill: true,
              difficulty: 10,
              startTime: 300000,
              endTime: 1800000,
              fightPercentage: null,
              keystoneLevel: 12,
              keystoneTime: 1500000,
            },
          ],
        },
      },
    });

    const res = await get(CODE);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Tuesday Raid");
    expect(body.encounters).toHaveLength(2);
    expect(body.encounters[0]).toMatchObject({ id: 3, encounterId: 2902, name: "Ulgrax", kill: true });
    expect(body.encounters[0]).not.toHaveProperty("encounterID");
    expect(body.encounters[1]).toMatchObject({ keystoneLevel: 12, keystoneTime: 1500000, keystoneLimit: 1800000 });
    expect(body.encounters[0].keystoneLimit).toBeNull();
  });

  it("returns an empty list when the report has no fights", async () => {
    wclQueryMock.mockResolvedValue({ reportData: { report: { title: "Empty", fights: null } } });

    const res = await get(CODE);

    expect((await res.json()).encounters).toEqual([]);
  });

  it("returns 502 when WarcraftLogs fails", async () => {
    wclQueryMock.mockRejectedValue(new Error("boom"));

    const res = await get(CODE);

    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("boom");
  });
});
