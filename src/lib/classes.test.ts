import { classColor, classIdFromName, classIdFromSlug } from "./classes";

describe("classIdFromSlug", () => {
  it("translates class names to WarcraftLogs ids", () => {
    expect(classIdFromSlug("death-knight")).toBe(1);
    expect(classIdFromSlug("warrior")).toBe(11);
    expect(classIdFromSlug("demon-hunter")).toBe(12);
  });

  it("returns null for unknown or missing names", () => {
    expect(classIdFromSlug("jedi")).toBeNull();
    expect(classIdFromSlug(undefined)).toBeNull();
  });
});

describe("classIdFromName", () => {
  it("translates actor subTypes to WarcraftLogs ids", () => {
    expect(classIdFromName("DeathKnight")).toBe(1);
    expect(classIdFromName("DemonHunter")).toBe(12);
    expect(classIdFromName("Priest")).toBe(7);
  });

  it("returns null for unknown or missing names", () => {
    expect(classIdFromName("Pet")).toBeNull();
    expect(classIdFromName(null)).toBeNull();
  });
});

describe("classColor", () => {
  it("maps WarcraftLogs class ids to class colours", () => {
    // WarcraftLogs ids are alphabetical: 1 = Death Knight, 11 = Warrior.
    expect(classColor(1)).toBe("#C41E3A");
    expect(classColor(11)).toBe("#C69B6D");
    expect(classColor(13)).toBe("#33937F");
  });

  it("returns undefined for missing or unknown classes", () => {
    expect(classColor(null)).toBeUndefined();
    expect(classColor(undefined)).toBeUndefined();
    expect(classColor(99)).toBeUndefined();
  });
});
