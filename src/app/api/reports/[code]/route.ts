import { NextResponse } from "next/server";
import { dungeonKey, fetchDungeonTimers } from "@/lib/dungeon-timers";
import { REPORT_CODE_PATTERN } from "@/lib/report-code";
import { wclQuery } from "@/lib/wcl";
import type { ReportDetail, ReportEncounter } from "@/lib/types";

const QUERY = `
  query ($code: String!) {
    reportData {
      report(code: $code) {
        title
        fights(killType: Encounters) {
          id
          encounterID
          name
          kill
          difficulty
          startTime
          endTime
          fightPercentage
          keystoneLevel
          keystoneTime
        }
      }
    }
  }
`;

interface ReportData {
  reportData: {
    report: {
      title: string;
      fights: (Omit<ReportEncounter, "encounterId" | "keystoneLimit"> & { encounterID: number })[] | null;
    } | null;
  };
}

export async function GET(_request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!REPORT_CODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "Invalid report code" }, { status: 400 });
  }

  try {
    const data = await wclQuery<ReportData>(QUERY, { code }, 300);
    const report = data.reportData.report;
    if (!report) {
      return NextResponse.json({ error: `Report "${code}" not found.` }, { status: 404 });
    }
    const fights = report.fights ?? [];
    const timers = fights.some((f) => f.keystoneLevel) ? await fetchDungeonTimers().catch(() => null) : null;
    const result: ReportDetail = {
      code,
      title: report.title,
      encounters: fights.map(({ encounterID, ...fight }) => ({
        ...fight,
        encounterId: encounterID,
        keystoneLimit: fight.keystoneLevel ? (timers?.get(dungeonKey(fight.name)) ?? null) : null,
      })),
    };
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
