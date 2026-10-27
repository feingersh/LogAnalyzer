import { NextResponse } from "next/server";
import { classIdFromSlug } from "@/lib/classes";
import { REGIONS, type CharacterMatch, type RegionSlug } from "@/lib/types";

// WarcraftLogs has no name search in its API (the website's search is behind a bot challenge),
// so global character search comes from Raider.IO. The picked region/realm slug is then looked up on WarcraftLogs.
const SEARCH_URL = "https://raider.io/api/search";
const MAX_MATCHES = 25;

interface SearchResponse {
  matches?: {
    type: string;
    name: string;
    data: {
      name: string;
      region: { slug: string };
      realm: { name: string; slug: string };
      class?: { slug: string };
    };
  }[];
}

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  try {
    const qs = new URLSearchParams({ term: name, type: "character" });
    const res = await fetch(`${SEARCH_URL}?${qs}`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Character search failed (${res.status})`);
    const body = (await res.json()) as SearchResponse;

    const matches: CharacterMatch[] = (body.matches ?? [])
      .filter((m) => m.type === "character")
      .flatMap((m) => {
        const region = m.data.region.slug.toUpperCase();
        if (!REGIONS.some((r) => r.slug === region)) return [];
        return [
          {
            name: m.data.name,
            classId: classIdFromSlug(m.data.class?.slug),
            region: region as RegionSlug,
            serverName: m.data.realm.name,
            serverSlug: m.data.realm.slug,
          },
        ];
      });

    // Exact name matches first; otherwise keep the order the search returned.
    const exact = (m: CharacterMatch) => (m.name.toLowerCase() === name.toLowerCase() ? 0 : 1);
    matches.sort((a, b) => exact(a) - exact(b));

    return NextResponse.json(matches.slice(0, MAX_MATCHES));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
