import { GET } from "./route";
import { wclQuery } from "@/lib/wcl";

jest.mock("@/lib/wcl");
const wclQueryMock = jest.mocked(wclQuery);

function get(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return GET(new Request(`http://localhost/api/reports?${qs}`));
}

beforeEach(() => wclQueryMock.mockReset());

describe("GET /api/reports", () => {
  it("returns 400 when the name or server is missing", async () => {
    expect((await get({ server: "illidan" })).status).toBe(400);
    expect((await get({ name: "Thrall" })).status).toBe(400);
  });

  it("returns 400 for an unknown region", async () => {
    const res = await get({ name: "Thrall", server: "illidan", region: "XX" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the character does not exist", async () => {
    wclQueryMock.mockResolvedValue({ characterData: { character: null } });

    const res = await get({ name: "Nobody", server: "illidan", region: "US" });

    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain('Character "Nobody" not found');
  });

  it("returns the character's reports with zone and guild flattened", async () => {
    wclQueryMock.mockResolvedValue({
      characterData: {
        character: {
          name: "Thrall",
          classID: 7,
          recentReports: {
            data: [
              {
                code: "abc123",
                title: "Tuesday Raid",
                startTime: 1000,
                endTime: 2000,
                zone: { id: 53, name: "The Venomous Abyss" },
                guild: { name: "Horde Heroes" },
                fights: [{ keystoneLevel: null, size: 20 }],
              },
              {
                code: "def456",
                title: "Pickup",
                startTime: 3000,
                endTime: 4000,
                zone: null,
                guild: null,
                fights: [{ keystoneLevel: 12, size: 5 }],
              },
            ],
          },
        },
      },
    });

    const res = await get({ name: "Thrall", server: "illidan", region: "US" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      name: "Thrall",
      classId: 7,
      reports: [
        {
          code: "abc123",
          title: "Tuesday Raid",
          startTime: 1000,
          endTime: 2000,
          zone: "The Venomous Abyss",
          zoneId: 53,
          guild: "Horde Heroes",
          kind: "raid",
        },
        {
          code: "def456",
          title: "Pickup",
          startTime: 3000,
          endTime: 4000,
          zone: null,
          zoneId: null,
          guild: null,
          kind: "mythic-plus",
        },
      ],
    });
  });

  it("returns 502 when WarcraftLogs fails", async () => {
    wclQueryMock.mockRejectedValue(new Error("boom"));

    const res = await get({ name: "Thrall", server: "illidan", region: "US" });

    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("boom");
  });
});
