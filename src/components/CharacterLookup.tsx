"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  REGIONS,
  type CharacterMatch,
  type CharacterReports,
  type RegionSlug,
  type Server,
} from "@/lib/types";
import { classColor } from "@/lib/classes";
import { addRecent, loadRecent, removeRecent, saveRecent, type RecentLookup } from "@/lib/recent-lookups";
import ReportItem from "./ReportItem";

export default function CharacterLookup() {
  const [region, setRegion] = useState<RegionSlug>("US");
  const [servers, setServers] = useState<Server[]>([]);
  const [serverText, setServerText] = useState("");
  const [name, setName] = useState("");
  const [loadingServers, setLoadingServers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CharacterReports | null>(null);
  const [showMythicPlus, setShowMythicPlus] = useState(true);
  const [showRaid, setShowRaid] = useState(true);
  const [recent, setRecent] = useState<RecentLookup[]>([]);
  const [matches, setMatches] = useState<CharacterMatch[] | null>(null);
  const pendingServerName = useRef<string | null>(null);

  // Read after mount: localStorage doesn't exist during SSR, and reading it in render would mismatch hydration.
  useEffect(() => {
    setRecent(loadRecent(window.localStorage));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingServers(true);
    setServers([]);
    setServerText("");
    fetch(`/api/servers?region=${region}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Failed to load servers");
        return body as Server[];
      })
      .then((list) => {
        if (cancelled) return;
        setServers(list);
        if (pendingServerName.current) {
          setServerText(pendingServerName.current);
          pendingServerName.current = null;
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoadingServers(false));
    return () => {
      cancelled = true;
    };
  }, [region]);

  const server = servers.find((s) => s.name.toLowerCase() === serverText.trim().toLowerCase());

  // Reports that are neither dungeon nor raid only show when both types are selected.
  const visibleReports = result?.reports.filter((r) =>
    r.kind === "mythic-plus" ? showMythicPlus : r.kind === "raid" ? showRaid : showMythicPlus && showRaid,
  );

  async function search(lookup: RecentLookup) {
    setLoading(true);
    setError(null);
    setResult(null);
    setMatches(null);
    try {
      const qs = new URLSearchParams({ name: lookup.name, server: lookup.serverSlug, region: lookup.region });
      const res = await fetch(`/api/reports?${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      const found = body as CharacterReports;
      setResult(found);
      const next = addRecent(recent, { ...lookup, name: found.name, classId: found.classId });
      setRecent(next);
      saveRecent(window.localStorage, next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // No server chosen: search for the name across all regions and servers, and let the user pick.
  async function findAcrossServers() {
    setLoading(true);
    setError(null);
    setResult(null);
    setMatches(null);
    try {
      const qs = new URLSearchParams({ name: name.trim() });
      const res = await fetch(`/api/characters/search?${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Search failed");
      const found = body as CharacterMatch[];
      if (found.length === 0) throw new Error(`No character named "${name.trim()}" found.`);
      setMatches(found);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (server) {
      void search({ region, serverName: server.name, serverSlug: server.slug, name: name.trim() });
    } else if (serverText.trim()) {
      setError(`"${serverText.trim()}" isn't a ${region} server. Pick one from the list, or clear it to search every region.`);
    } else {
      void findAcrossServers();
    }
  }

  function pickRecent(r: RecentLookup) {
    setMatches(null);
    setName(r.name);
    if (r.region === region) {
      setServerText(r.serverName);
    } else {
      // The region effect clears the server text; restore it once the new server list loads.
      pendingServerName.current = r.serverName;
      setRegion(r.region);
    }
    void search(r);
  }

  function removeOne(r: RecentLookup) {
    const next = removeRecent(recent, r);
    setRecent(next);
    saveRecent(window.localStorage, next);
  }

  function clearRecent() {
    setRecent([]);
    saveRecent(window.localStorage, []);
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="form">
        <select
          aria-label="Region"
          value={region}
          onChange={(e) => {
            pendingServerName.current = null;
            setRegion(e.target.value as RegionSlug);
          }}
        >
          {REGIONS.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.slug}
            </option>
          ))}
        </select>
        <input
          className="server"
          aria-label="Server"
          list="servers"
          placeholder={loadingServers ? "Loading servers…" : "Server (optional)"}
          value={serverText}
          onChange={(e) => setServerText(e.target.value)}
          disabled={loadingServers}
          autoComplete="off"
        />
        <datalist id="servers">
          {servers.map((s) => (
            <option key={s.slug} value={s.name} />
          ))}
        </datalist>
        <input
          aria-label="Character"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Character"
          required
        />
        <button type="submit" disabled={loading || loadingServers || !name.trim()}>
          {loading ? "Searching…" : server ? "Find reports" : "Find character"}
        </button>
      </form>

      {matches && (
        <div className="recent" role="group" aria-label="Matching characters">
          <span className="recent-label">Select a character</span>
          {matches.map((m) => (
            <button
              key={`${m.region}/${m.serverSlug}/${m.name}`}
              type="button"
              className="recent-chip"
              onClick={() => pickRecent(m)}
              disabled={loading}
            >
              <span style={{ color: classColor(m.classId) }}>{m.name}</span> · {m.serverName} ({m.region})
            </button>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="recent" role="group" aria-label="Recent lookups">
          <span className="recent-label">Recent</span>
          {recent.map((r) => (
            <span key={`${r.region}/${r.serverSlug}/${r.name.toLowerCase()}`} className="recent-item">
              <button type="button" className="recent-chip" onClick={() => pickRecent(r)} disabled={loading}>
                <span style={{ color: classColor(r.classId) }}>{r.name}</span> · {r.serverName} ({r.region})
              </button>
              <button
                type="button"
                className="recent-remove"
                aria-label={`Remove ${r.name} from recent lookups`}
                onClick={() => removeOne(r)}
              >
                ×
              </button>
            </span>
          ))}
          <button type="button" className="recent-clear" onClick={clearRecent}>
            Clear
          </button>
        </div>
      )}

      <div className="filters" role="group" aria-label="Log type">
        <label>
          <input
            type="checkbox"
            checked={showMythicPlus}
            onChange={(e) => setShowMythicPlus(e.target.checked)}
          />
          Mythic+
        </label>
        <label>
          <input type="checkbox" checked={showRaid} onChange={(e) => setShowRaid(e.target.checked)} />
          Raid
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <section>
          <h2>
            Recent reports for <span style={{ color: classColor(result.classId) }}>{result.name}</span>
          </h2>
          {result.reports.length === 0 ? (
            <p>No recent reports found.</p>
          ) : !showMythicPlus && !showRaid ? (
            <p>Select at least one log type.</p>
          ) : visibleReports?.length === 0 ? (
            <p>No matching reports.</p>
          ) : (
            <ul className="reports">
              {visibleReports?.map((r) => (
                <ReportItem key={r.code} report={r} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
