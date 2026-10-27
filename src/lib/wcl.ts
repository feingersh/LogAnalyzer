import "server-only";

const TOKEN_URL = "https://www.warcraftlogs.com/oauth/token";
const API_URL = "https://www.warcraftlogs.com/api/v2/client";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const id = process.env.WCL_CLIENT_ID;
  const secret = process.env.WCL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("WCL_CLIENT_ID and WCL_CLIENT_SECRET must be set in .env.local");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`WarcraftLogs auth failed (${res.status})`);

  const json = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh a minute early.
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

export async function wclQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
  revalidate?: number,
): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
  });
  if (!res.ok) throw new Error(`WarcraftLogs request failed (${res.status})`);

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}
