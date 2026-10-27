import { GET } from "./route";
import { wclQuery } from "@/lib/wcl";

jest.mock("@/lib/wcl");
const wclQueryMock = jest.mocked(wclQuery);

function get(region?: string) {
  const qs = region ? `?region=${region}` : "";
  return GET(new Request(`http://localhost/api/servers${qs}`));
}

function page(names: string[], hasMore: boolean) {
  return {
    worldData: {
      region: {
        servers: {
          has_more_pages: hasMore,
          data: names.map((name) => ({ name, slug: name.toLowerCase() })),
        },
      },
    },
  };
}

beforeEach(() => wclQueryMock.mockReset());

describe("GET /api/servers", () => {
  it("returns 400 for an unknown region", async () => {
    const res = await get("XX");
    expect(res.status).toBe(400);
    expect(wclQueryMock).not.toHaveBeenCalled();
  });

  it("combines every page and sorts by name", async () => {
    wclQueryMock
      .mockResolvedValueOnce(page(["Illidan", "Area 52"], true))
      .mockResolvedValueOnce(page(["Zuljin"], false));

    const res = await get("US");

    expect(wclQueryMock).toHaveBeenCalledTimes(2);
    expect((await res.json()).map((s: { name: string }) => s.name)).toEqual([
      "Area 52",
      "Illidan",
      "Zuljin",
    ]);
  });

  it("queries the WarcraftLogs id for the region", async () => {
    wclQueryMock.mockResolvedValue(page([], false));

    await get("EU");

    expect(wclQueryMock.mock.calls[0][1]).toEqual({ region: 2, page: 1 });
  });

  it("defaults to US when no region is given", async () => {
    wclQueryMock.mockResolvedValue(page([], false));

    await get();

    expect(wclQueryMock.mock.calls[0][1]).toEqual({ region: 1, page: 1 });
  });

  it("returns 502 when WarcraftLogs fails", async () => {
    wclQueryMock.mockRejectedValue(new Error("boom"));

    const res = await get("US");

    expect(res.status).toBe(502);
  });
});
