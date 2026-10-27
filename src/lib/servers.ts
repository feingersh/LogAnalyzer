import "server-only";
import { wclQuery } from "./wcl";
import type { Server } from "./types";

const QUERY = `
  query ($region: Int!, $page: Int!) {
    worldData {
      region(id: $region) {
        servers(limit: 100, page: $page) {
          has_more_pages
          data { name slug }
        }
      }
    }
  }
`;

interface ServersData {
  worldData: {
    region: { servers: { has_more_pages: boolean; data: Server[] } };
  };
}

/** Every server in a region, sorted by name. Cached for a day since the list rarely changes. */
export async function fetchServers(regionId: number): Promise<Server[]> {
  const servers: Server[] = [];
  for (let page = 1; ; page++) {
    const data = await wclQuery<ServersData>(QUERY, { region: regionId, page }, 86400);
    const { has_more_pages, data: rows } = data.worldData.region.servers;
    servers.push(...rows);
    if (!has_more_pages) break;
  }
  return servers.sort((a, b) => a.name.localeCompare(b.name));
}
