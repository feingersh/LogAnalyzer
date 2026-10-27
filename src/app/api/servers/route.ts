import { NextResponse } from "next/server";
import { fetchServers } from "@/lib/servers";
import { REGIONS } from "@/lib/types";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("region")?.toUpperCase() ?? "US";
  const region = REGIONS.find((r) => r.slug === slug);
  if (!region) return NextResponse.json({ error: "Unknown region" }, { status: 400 });

  try {
    return NextResponse.json(await fetchServers(region.id));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
