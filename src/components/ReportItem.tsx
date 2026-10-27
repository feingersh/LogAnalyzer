"use client";

import { useState } from "react";
import { difficultyName, formatDuration } from "@/lib/format";
import DungeonRoute from "./DungeonRoute";
import type { ReportDetail, ReportEncounter, ReportSummary } from "@/lib/types";

function EncounterRow({ code, encounter }: { code: string; encounter: ReportEncounter }) {
  const [routeOpen, setRouteOpen] = useState(false);
  // A key's official time includes death penalties, so prefer it to the length of the fight.
  const official = encounter.keystoneLevel && encounter.keystoneTime ? encounter.keystoneTime : null;
  const details = [
    encounter.keystoneLevel ? `+${encounter.keystoneLevel}` : difficultyName(encounter.difficulty),
    formatDuration(official ?? encounter.endTime - encounter.startTime),
  ].filter(Boolean);
  // Negative is time to spare (timed), positive is time over (depleted).
  const split = official !== null && encounter.keystoneLimit ? official - encounter.keystoneLimit : null;
  // Routes are offered for every Mythic+ run, including depleted and abandoned ones.
  const hasRoute = !!encounter.keystoneLevel;

  const content = (
    <>
      <span className={encounter.kill ? "encounter-kill" : "encounter-wipe"}>
        {encounter.kill ? "Kill" : "Wipe"}
      </span>
      <span className="encounter-name">{encounter.name}</span>
      <span className="encounter-meta">
        {details.join(" · ")}
        {split !== null && (
          <span className={split <= 0 ? "split-under" : "split-over"}>
            {" "}
            ({split <= 0 ? "−" : "+"}
            {formatDuration(Math.abs(split))})
          </span>
        )}
      </span>
      {hasRoute && <span className="route-toggle">{routeOpen ? "Hide route" : "Route"}</span>}
    </>
  );

  return (
    <li>
      {hasRoute ? (
        // The whole row is the toggle, not just the "Route" label.
        <button
          type="button"
          className="encounter encounter-link"
          aria-expanded={routeOpen}
          onClick={() => setRouteOpen((open) => !open)}
        >
          {content}
        </button>
      ) : (
        <div className="encounter">{content}</div>
      )}
      {routeOpen && <DungeonRoute code={code} fightId={encounter.id} />}
    </li>
  );
}

export default function ReportItem({ report }: { report: ReportSummary }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${report.code}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      setDetail(body as ReportDetail);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const opening = !open;
    setOpen(opening);
    if (opening && !detail && !loading) load();
  }

  return (
    <li className={open ? "report-open" : undefined}>
      <button
        type="button"
        className="pill"
        aria-expanded={open}
        onClick={toggle}
        title={report.title}
      >
        {report.zoneId !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="pill-icon"
            src={`https://assets.rpglogs.com/img/warcraft/zones/zone-${report.zoneId}.png`}
            alt={report.zone ?? "Zone"}
            title={report.zone ?? undefined}
            onError={(e) => (e.currentTarget.style.visibility = "hidden")}
          />
        ) : (
          <span className="pill-icon" />
        )}
        <span className="pill-text">
          <span className="pill-title">{report.title}</span>
          <span className="pill-date">{new Date(report.startTime).toLocaleString()}</span>
        </span>
      </button>

      {open && (
        <div className="report-detail">
          <a
            href={`https://www.warcraftlogs.com/reports/${report.code}`}
            target="_blank"
            rel="noreferrer"
          >
            Open on WarcraftLogs
          </a>
          {loading && <p>Loading encounters…</p>}
          {error && <p className="error">{error}</p>}
          {detail &&
            (detail.encounters.length === 0 ? (
              <p>No encounters in this report.</p>
            ) : (
              <ul className="encounters">
                {detail.encounters.map((enc) => (
                  <EncounterRow key={enc.id} code={report.code} encounter={enc} />
                ))}
              </ul>
            ))}
        </div>
      )}
    </li>
  );
}
