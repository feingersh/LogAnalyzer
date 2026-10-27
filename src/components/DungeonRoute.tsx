"use client";

import { useEffect, useMemo, useState } from "react";
import { fitBounds, findDungeonMap, toMapFraction, type DungeonMap } from "@/lib/dungeon-maps";
import { formatDuration } from "@/lib/format";
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

function pullSummary(pull: DungeonPull): string {
  return pull.enemies
    .slice(0, 3)
    .map((e) => (e.count > 1 ? `${e.name} ×${e.count}` : e.name))
    .join(", ");
}

export default function DungeonRoute({ code, fightId }: { code: string; fightId: number }) {
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

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

  // Running enemy-forces total after each pull, for the list.
  let running = 0;
  const cumulative = route.pulls.map((p) => (running += p.forces));
  const required = route.countRequired;

  return (
    <div className="route">
      <ol className="pulls" onMouseLeave={() => setHovered(null)}>
        {route.pulls.map((p, i) => (
          <li
            key={i}
            className={`pull${hovered === i ? " pull-hovered" : ""}`}
            onMouseEnter={() => setHovered(i)}
          >
            <span className="pull-number">{i + 1}</span>
            <span className="pull-main">
              <span className="pull-title">
                {p.boss ? `Boss: ${p.name}` : pullSummary(p) || p.name}
              </span>
              <span className="pull-meta">
                {formatDuration(p.startTime)} · {formatDuration(p.endTime - p.startTime)}
                {p.forces > 0 && required
                  ? ` · ~+${((p.forces / required) * 100).toFixed(1)}% (~${((cumulative[i] / required) * 100).toFixed(1)}%)`
                  : ""}
              </span>
            </span>
          </li>
        ))}
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
  );
}
