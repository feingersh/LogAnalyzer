"use client";

import { useEffect, useMemo, useState } from "react";
import { fitBounds, findDungeonMap, toMapFraction, type DungeonMap } from "@/lib/dungeon-maps";
import { classColor } from "@/lib/classes";
import { formatDuration } from "@/lib/format";
import { wclPullUrl } from "@/lib/pulls";
import type { DungeonPull, DungeonRoute as Route } from "@/lib/types";

const FALLBACK_SIZE = { width: 1024, height: 683 };

function floorsOf(pulls: DungeonPull[]): number[] {
  const ids: number[] = [];
  for (const p of pulls) if (p.mapId !== null && !ids.includes(p.mapId)) ids.push(p.mapId);
  return ids;
}

/** The calibrated map for a floor, or a plain canvas fitted around that floor's pulls. */
function mapForFloor(route: Route, mapId: number): DungeonMap {
  const known = findDungeonMap(route.zoneId, mapId);
  if (known) return known;
  const points = route.pulls.flatMap((p) =>
    p.mapId === mapId && p.x !== null && p.y !== null ? [{ x: p.x, y: p.y }] : [],
  );
  return {
    zoneId: route.zoneId ?? 0,
    mapId,
    image: "",
    ...FALLBACK_SIZE,
    bounds: fitBounds(points.length ? points : [{ x: 0, y: 0 }], FALLBACK_SIZE.width, FALLBACK_SIZE.height),
  };
}

/** Deaths in a pull grouped by player, in order of first death. */
function deathCounts(pull: DungeonPull): { name: string; classId: number | null; count: number }[] {
  const counts = new Map<string, { name: string; classId: number | null; count: number }>();
  for (const d of pull.deaths) {
    const entry = counts.get(d.name) ?? { name: d.name, classId: d.classId, count: 0 };
    entry.count++;
    counts.set(d.name, entry);
  }
  return [...counts.values()];
}

export default function DungeonRoute({ code, fightId }: { code: string; fightId: number }) {
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reports/${code}/pulls?fight=${fightId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Request failed");
        return body as Route;
      })
      .then((r) => !cancelled && setRoute(r))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [code, fightId]);

  const floors = useMemo(() => (route ? floorsOf(route.pulls) : []), [route]);

  if (error) return <p className="error">{error}</p>;
  if (!route) return <p>Loading route…</p>;
  if (route.pulls.length === 0) return <p>No route data for this run.</p>;

  const hoveredPull = hovered === null ? null : route.pulls[hovered];
  // Hovering a pull on another floor switches the map to that floor.
  const floor = hoveredPull?.mapId ?? selectedFloor ?? floors[0] ?? null;
  const map = floor === null ? null : mapForFloor(route, floor);
  const onFloor = (p: DungeonPull) => map !== null && p.mapId === map.mapId && p.x !== null && p.y !== null;

  const at = (p: DungeonPull) => {
    const { fx, fy } = toMapFraction(map!.bounds, p.x!, p.y!);
    return { cx: fx * map!.width, cy: fy * map!.height };
  };

  // Total time lost to deaths once each pull is done.
  let lost = 0;
  const lostAfter = route.pulls.map((p) => (lost = p.deaths.at(-1)?.timeLost ?? lost));

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  return (
    <>
    {route.players.length > 0 && (
      <ul className="party" aria-label="Group members">
        {route.players.map((pl) => (
          <li key={pl.name} className="party-pill">
            {pl.specIcon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="spec-icon"
                src={pl.specIcon}
                alt=""
                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
              />
            )}
            {pl.profileUrl ? (
              <a
                href={pl.profileUrl}
                target="_blank"
                rel="noreferrer"
                title="Open on Raider.IO"
                style={{ color: classColor(pl.classId) }}
              >
                {pl.name}
              </a>
            ) : (
              <span style={{ color: classColor(pl.classId) }}>{pl.name}</span>
            )}
          </li>
        ))}
      </ul>
    )}
    <div className="route">
      <ol className="pulls" onMouseLeave={() => setHovered(null)}>
        {route.pulls.map((p, i) => {
          const open = expanded.has(i);
          const pullPenalty = p.deaths.reduce((sum, d) => sum + d.penalty, 0);
          return (
            <li
              key={i}
              className={`pull${hovered === i ? " pull-hovered" : ""}`}
              onMouseEnter={() => setHovered(i)}
            >
              <button type="button" className="pull-head" aria-expanded={open} onClick={() => toggle(i)}>
                <span className="pull-number">{i + 1}</span>
                <span className="pull-main">
                  <span className="pull-title">{p.boss ? `Boss: ${p.name}` : `Trash ${i + 1}`}</span>
                  <span className="pull-meta">
                    {formatDuration(p.startTime)} · {formatDuration(p.endTime - p.startTime)}
                    {p.deaths.length > 0 && (
                      <span className="pull-death"> · −{lostAfter[i] / 1000}s total</span>
                    )}
                  </span>
                </span>
              </button>
              {open && (
                <div className="pull-body">
                  {p.enemies.length > 0 && (
                    <ul className="pull-enemies">
                      {p.enemies.map((e) => (
                        <li key={e.npcId}>
                          {e.count}× {e.name}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.deaths.length > 0 && (
                    <p className="pull-death">
                      {deathCounts(p).map((d, n) => (
                        <span key={d.name}>
                          {n > 0 && ", "}
                          <span style={{ color: classColor(d.classId) }}>{d.name}</span> died
                          {d.count > 1 && ` x${d.count}`}
                        </span>
                      ))}{" "}
                      · −{pullPenalty / 1000}s
                    </p>
                  )}
                  <a
                    href={wclPullUrl(code, route.fightId, p.reportStart, p.reportEnd)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open on WarcraftLogs ↗
                  </a>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="route-map">
        {floors.length > 1 && (
          <div className="floors" role="group" aria-label="Floor">
            {floors.map((id, i) => (
              <button
                key={id}
                type="button"
                aria-pressed={floor === id}
                onClick={() => setSelectedFloor(id)}
              >
                Floor {i + 1}
              </button>
            ))}
          </div>
        )}
        {map && (
          <svg
            viewBox={`0 0 ${map.width} ${map.height}`}
            role="img"
            aria-label={`${route.dungeon} route`}
          >
            <rect width={map.width} height={map.height} className="map-canvas" />
            {map.image && <image href={map.image} width={map.width} height={map.height} />}
            <polyline
              className="route-line"
              points={route.pulls
                .filter(onFloor)
                .map((p) => {
                  const { cx, cy } = at(p);
                  return `${cx},${cy}`;
                })
                .join(" ")}
            />
            {route.pulls.map((p, i) => {
              if (!onFloor(p)) return null;
              const { cx, cy } = at(p);
              const active = hovered === i;
              let box = null;
              if (active && p.boundingBox) {
                const a = toMapFraction(map.bounds, p.boundingBox.minX, p.boundingBox.maxY);
                const b = toMapFraction(map.bounds, p.boundingBox.maxX, p.boundingBox.minY);
                box = (
                  <rect
                    className="pull-box"
                    x={a.fx * map.width}
                    y={a.fy * map.height}
                    width={(b.fx - a.fx) * map.width}
                    height={(b.fy - a.fy) * map.height}
                  />
                );
              }
              return (
                <g
                  key={i}
                  className={`pull-marker${active ? " active" : ""}${p.boss ? " boss" : ""}${
                    hovered !== null && !active ? " dim" : ""
                  }`}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {box}
                  <circle cx={cx} cy={cy} r={active ? 17 : 13} />
                  <text x={cx} y={cy} dy="0.35em" textAnchor="middle">
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        {map && !map.image && (
          <p className="route-note">No saved map for this dungeon floor; showing pull positions only.</p>
        )}
      </div>
    </div>
    </>
  );
}
