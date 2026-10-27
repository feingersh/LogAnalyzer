import { NextResponse } from "next/server";
import { wclQuery } from "@/lib/wcl";
import { classifyReport, type FightInfo } from "@/lib/classify";
import { REGIONS, type CharacterReports } from "@/lib/types";

const QUERY = `
  query ($name: String!, $server: String!, $region: String!) {
    characterData {
      character(name: $name, serverSlug: $server, serverRegion: $region) {
        name
        classID
        recentReports(limit: 20) {
          data {
            code
            title
            startTime
            endTime
            zone { id name }
            guild { name }
            fights { keystoneLevel size }
          }
        }
      }
    }
  }
`;

interface ReportsData {
  characterData: {
    character: {
      name: string;
      classID: number | null;
      recentReports: {
        data: {
          code: string;
          title: string;
          startTime: number;
          endTime: number;
          zone: { id: number; name: string } | null;
          guild: { name: string } | null;
          fights: FightInfo[] | null;
        }[];
      };
    } | null;
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const name = params.get("name")?.trim();
  const server = params.get("server");
  const region = params.get("region")?.toUpperCase() ?? "US";

  if (!name || !server) {
    return NextResponse.json({ error: "name and server are required" }, { status: 400 });
  }
  if (!REGIONS.some((r) => r.slug === region)) {
    return NextResponse.json({ error: "Unknown region" }, { status: 400 });
  }

  try {
    const data = await wclQuery<ReportsData>(QUERY, { name, server, region });
    const character = data.characterData.character;
    if (!character) {
      return NextResponse.json(
        { error: `Character "${name}" not found on that server.` },
        { status: 404 },
      );
    }
    const result: CharacterReports = {
      name: character.name,
      classId: character.classID ?? null,
      reports: character.recentReports.data.map((r) => ({
        code: r.code,
        title: r.title,
        startTime: r.startTime,
        endTime: r.endTime,
        zone: r.zone?.name ?? null,
        zoneId: r.zone?.id ?? null,
        guild: r.guild?.name ?? null,
        kind: classifyReport(r.zone?.name ?? null, r.fights),
      })),
    };
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
