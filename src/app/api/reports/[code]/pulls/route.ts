import { NextResponse } from "next/server";
import {
  resolveRealmSlug,
  specsFromPlayerDetails,
  toDungeonRoute,
  type RawDeath,
  type RawKeystoneFight,
  type RawPlayer,
} from "@/lib/pulls";
import { fetchServers } from "@/lib/servers";
import { REGIONS, type Server } from "@/lib/types";
import { REPORT_CODE_PATTERN } from "@/lib/report-code";
import { wclQuery } from "@/lib/wcl";

const QUERY = `
  query ($code: String!, $fight: Int!) {
    reportData {
      report(code: $code) {
        masterData {
          actors(type: "NPC") { gameID name }
          players: actors(type: "Player") { id name subType server }
        }
        region { slug }
        playerDetails(fightIDs: [$fight])
        deaths: events(dataType: Deaths, hostilityType: Friendlies, fightIDs: [$fight], limit: 200) {
          data
        }
        fights(fightIDs: [$fight]) {
          id
          name
          friendlyPlayers
          keystoneLevel
          startTime
          countRequired
          countReached
          npcCountMap
          gameZone { id }
          dungeonPulls {
            id
            name
            encounterID
            startTime
            endTime
            x
            y
            maps { id }
            boundingBox { minX maxX minY maxY }
            enemyNPCs { gameID minimumInstanceID maximumInstanceID }
          }
        }
      }
    }
  }
`;

interface PullsData {
  reportData: {
    report: {
      masterData: {
        actors: { gameID: number; name: string }[] | null;
        players: RawPlayer[] | null;
      } | null;
      region: { slug: string } | null;
      playerDetails: unknown;
      deaths: { data: RawDeath[] | null } | null;
      fights: RawKeystoneFight[];
    } | null;
  };
}

/** The region's server list, used to turn WarcraftLogs realm names into Raider.IO slugs. Best effort. */
async function knownServers(region: string | null, players: RawPlayer[]): Promise<Server[]> {
  const id = REGIONS.find((r) => r.slug === region)?.id;
  if (!id || !players.some((p) => p.server)) return [];
  try {
    return await fetchServers(id);
  } catch {
    return [];
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const fightParam = new URL(request.url).searchParams.get("fight");
  const fight = Number(fightParam);
  if (!REPORT_CODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "Invalid report code" }, { status: 400 });
  }
  if (!fightParam || !Number.isInteger(fight) || fight < 1) {
    return NextResponse.json({ error: "fight must be a positive integer" }, { status: 400 });
  }

  try {
    const data = await wclQuery<PullsData>(QUERY, { code, fight }, 300);
    const report = data.reportData.report;
    const raw = report?.fights[0];
    if (!report || !raw) {
      return NextResponse.json({ error: `Fight ${fight} not found in report.` }, { status: 404 });
    }
    const region = report.region?.slug?.toUpperCase() ?? null;
    const players = report.masterData?.players ?? [];
    const servers = await knownServers(region, players);
    const specs = specsFromPlayerDetails(report.playerDetails);
    return NextResponse.json(
      toDungeonRoute(
        raw,
        report.masterData?.actors ?? [],
        players.map((p) => ({
          ...p,
          server: p.server ? resolveRealmSlug(p.server, servers) : null,
          spec: specs.get(p.id) ?? null,
        })),
        report.deaths?.data ?? [],
        region,
      ),
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
