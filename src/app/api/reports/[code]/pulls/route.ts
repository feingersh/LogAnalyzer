import { NextResponse } from "next/server";
import { toDungeonRoute, type RawKeystoneFight } from "@/lib/pulls";
import { REPORT_CODE_PATTERN } from "@/lib/report-code";
import { wclQuery } from "@/lib/wcl";

const QUERY = `
  query ($code: String!, $fight: Int!) {
    reportData {
      report(code: $code) {
        masterData {
          actors(type: "NPC") { gameID name }
        }
        fights(fightIDs: [$fight]) {
          id
          name
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
      masterData: { actors: { gameID: number; name: string }[] | null } | null;
      fights: RawKeystoneFight[];
    } | null;
  };
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
    return NextResponse.json(toDungeonRoute(raw, report.masterData?.actors ?? []));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
