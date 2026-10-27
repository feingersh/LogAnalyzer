import { GET } from "./route";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function get(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return GET(new Request(`http://localhost/api/characters/search?${qs}`));
}

const match = (name: string, region: string, realm: string, cls = "death-knight", type = "character") => ({
  type,
  name,
  data: {
    name,
    region: { slug: region },
    realm: { name: realm, slug: realm.toLowerCase().replace(/ /g, "-") },
    class: { slug: cls },
  },
});

const respond = (matches: unknown[], ok = true, status = 200) =>
  fetchMock.mockResolvedValue({ ok, status, json: async () => ({ matches }) });

beforeEach(() => fetchMock.mockReset());

describe("GET /api/characters/search", () => {
  it("returns 400 when the name is missing", async () => {
    expect((await get({})).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("searches globally by name, with no region", async () => {
    respond([]);

    await get({ name: "Shudk" });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://raider.io/api/search");
    expect(url.searchParams.get("term")).toBe("Shudk");
    expect(url.searchParams.has("region")).toBe(false);
  });

  it("maps matches to region, server and WarcraftLogs class id", async () => {
    respond([match("Shudk", "us", "Thrall"), match("Shudk", "eu", "Area 52", "warrior")]);

    const res = await get({ name: "Shudk" });

    expect(await res.json()).toEqual([
      { name: "Shudk", classId: 1, region: "US", serverName: "Thrall", serverSlug: "thrall" },
      { name: "Shudk", classId: 11, region: "EU", serverName: "Area 52", serverSlug: "area-52" },
    ]);
  });

  it("drops non-characters and regions the app doesn't support, and lists exact names first", async () => {
    respond([
      match("Shudkx", "us", "Illidan"),
      match("Shudk", "cn", "Somewhere"),
      match("Shudk Guild", "us", "Illidan", "mage", "guild"),
      match("Shudk", "kr", "Azshara"),
    ]);

    const res = await get({ name: "shudk" });

    expect((await res.json()).map((m: { name: string; region: string }) => `${m.name}/${m.region}`)).toEqual([
      "Shudk/KR",
      "Shudkx/US",
    ]);
  });

  it("leaves classId null for an unknown class", async () => {
    respond([match("Shudk", "us", "Thrall", "jedi")]);

    expect((await (await get({ name: "Shudk" })).json())[0].classId).toBeNull();
  });

  it("returns 502 when the search service fails", async () => {
    respond([], false, 503);

    const res = await get({ name: "Shudk" });

    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("503");
  });
});
