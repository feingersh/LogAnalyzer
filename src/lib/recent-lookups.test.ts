import { addRecent, loadRecent, removeRecent, saveRecent, MAX_RECENT, RECENT_KEY, type RecentLookup } from "./recent-lookups";

const entry = (name: string, over: Partial<RecentLookup> = {}): RecentLookup => ({
  region: "US",
  serverName: "Area 52",
  serverSlug: "area-52",
  name,
  ...over,
});

describe("addRecent", () => {
  it("puts the newest entry first", () => {
    expect(addRecent([entry("A")], entry("B")).map((e) => e.name)).toEqual(["B", "A"]);
  });

  it("moves a repeated character to the front without duplicating it", () => {
    const list = addRecent([entry("A"), entry("B")], entry("a"));
    expect(list.map((e) => e.name)).toEqual(["a", "B"]);
  });

  it("treats the same name on another server or region as distinct", () => {
    const list = addRecent([entry("A")], entry("A", { serverSlug: "illidan", serverName: "Illidan" }));
    expect(list).toHaveLength(2);
    expect(addRecent(list, entry("A", { region: "EU" }))).toHaveLength(3);
  });

  it("caps the list", () => {
    let list: RecentLookup[] = [];
    for (let i = 0; i < MAX_RECENT + 3; i++) list = addRecent(list, entry(`C${i}`));
    expect(list).toHaveLength(MAX_RECENT);
    expect(list[0].name).toBe(`C${MAX_RECENT + 2}`);
  });
});

describe("removeRecent", () => {
  it("removes only the matching character", () => {
    const other = entry("A", { region: "EU" });
    const list = [entry("A"), entry("B"), other];
    expect(removeRecent(list, entry("a"))).toEqual([entry("B"), other]);
  });

  it("leaves the list unchanged when the character isn't in it", () => {
    expect(removeRecent([entry("A")], entry("Z"))).toEqual([entry("A")]);
  });
});

describe("loadRecent / saveRecent", () => {
  const store = (value: string | null) => ({ getItem: () => value });

  it("round-trips", () => {
    let saved = "";
    saveRecent({ setItem: (_k, v) => (saved = v) }, [entry("A")]);
    expect(loadRecent(store(saved))).toEqual([entry("A")]);
  });

  it("uses the recentLookups key", () => {
    const setItem = jest.fn();
    saveRecent({ setItem }, []);
    expect(setItem).toHaveBeenCalledWith(RECENT_KEY, "[]");
  });

  it("returns [] for missing, corrupt or non-array data", () => {
    expect(loadRecent(store(null))).toEqual([]);
    expect(loadRecent(store("{nope"))).toEqual([]);
    expect(loadRecent(store('{"a":1}'))).toEqual([]);
  });

  it("drops invalid entries", () => {
    const raw = JSON.stringify([entry("A"), { name: "x" }, entry("B", { region: "XX" as never }), null]);
    expect(loadRecent(store(raw)).map((e) => e.name)).toEqual(["A"]);
  });

  it("survives storage that throws", () => {
    expect(
      loadRecent({
        getItem: () => {
          throw new Error("denied");
        },
      }),
    ).toEqual([]);
    expect(() =>
      saveRecent(
        {
          setItem: () => {
            throw new Error("full");
          },
        },
        [entry("A")],
      ),
    ).not.toThrow();
  });
});
