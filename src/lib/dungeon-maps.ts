export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface DungeonMap {
  zoneId: number;
  mapId: number;
  /** Saved under public/maps; see public/maps/README.md. */
  image: string;
  width: number;
  height: number;
  /** The world-coordinate rectangle the image covers. Hand-tune if markers look off. */
  bounds: MapBounds;
}

// Bounds are a best guess: the pull extents seen in a sample report, fitted into the
// image with margin. WCL x runs left to right and y runs bottom to top.
export const DUNGEON_MAPS: DungeonMap[] = [
  { zoneId: 1762, mapId: 1004, image: "/maps/1762-0.jpg", width: 1009, height: 673, bounds: { minX: -329829, maxX: -246457, minY: -119488, maxY: -63879 } }, // Kings' Rest
  { zoneId: 1877, mapId: 1038, image: "/maps/1877-0.jpg", width: 1009, height: 673, bounds: { minX: -379041, maxX: -277139, minY: 312307, maxY: 380276 } }, // Temple of Sethraliss floor 1
  { zoneId: 1877, mapId: 1043, image: "/maps/1877-1.jpg", width: 1009, height: 673, bounds: { minX: -400650, maxX: -309853, minY: 364400, maxY: 424961 } }, // Temple of Sethraliss floor 2
  { zoneId: 2521, mapId: 2095, image: "/maps/2521-0.jpg", width: 1024, height: 683, bounds: { minX: -4426, maxX: 43758, minY: 135406, maxY: 167545 } }, // Ruby Life Pools floor 1
  { zoneId: 2521, mapId: 2094, image: "/maps/2521-1.jpg", width: 1024, height: 683, bounds: { minX: -23532, maxX: 50194, minY: 137743, maxY: 186918 } }, // Ruby Life Pools floor 2
  { zoneId: 2859, mapId: 2500, image: "/maps/2859-0.jpg", width: 1024, height: 683, bounds: { minX: -219360, maxX: -123263, minY: 104971, maxY: 169066 } }, // The Blinding Vale
  { zoneId: 2923, mapId: 2574, image: "/maps/2923-0.jpg", width: 1024, height: 683, bounds: { minX: 35978, maxX: 69976, minY: 443088, maxY: 465765 } }, // Voidscar Arena floor 1
  { zoneId: 2923, mapId: 2572, image: "/maps/2923-1.jpg", width: 1024, height: 683, bounds: { minX: 23313, maxX: 63811, minY: 439287, maxY: 466298 } }, // Voidscar Arena floor 2
  { zoneId: 2923, mapId: 2573, image: "/maps/2923-2.jpg", width: 1024, height: 683, bounds: { minX: 10757, maxX: 79470, minY: 472845, maxY: 518676 } }, // Voidscar Arena floor 3
  { zoneId: 2993, mapId: 2588, image: "/maps/2993-0.jpg", width: 1024, height: 683, bounds: { minX: -247126, maxX: -176604, minY: 145759, maxY: 192797 } }, // Altar of Fangs floor 1
  { zoneId: 2993, mapId: 2589, image: "/maps/2993-1.jpg", width: 1024, height: 683, bounds: { minX: -221826, maxX: -184814, minY: 121155, maxY: 145842 } }, // Altar of Fangs floor 2
  { zoneId: 2993, mapId: 2590, image: "/maps/2993-2.jpg", width: 1024, height: 683, bounds: { minX: -239682, maxX: -169231, minY: 102823, maxY: 149813 } }, // Altar of Fangs floor 3
];

export function findDungeonMap(zoneId: number | null, mapId: number | null): DungeonMap | undefined {
  return DUNGEON_MAPS.find((m) => m.zoneId === zoneId && m.mapId === mapId);
}

/** World coordinates to 0..1 image coordinates (origin top-left), clamped to the image. */
export function toMapFraction(bounds: MapBounds, x: number, y: number): { fx: number; fy: number } {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return {
    fx: clamp((x - bounds.minX) / (bounds.maxX - bounds.minX)),
    fy: clamp(1 - (y - bounds.minY) / (bounds.maxY - bounds.minY)),
  };
}

/**
 * Bounds for an image of the given size that keep the points in the middle at a uniform
 * scale, leaving a margin. Used for floors with no calibrated map.
 */
export function fitBounds(
  points: { x: number; y: number }[],
  width: number,
  height: number,
  fill = 0.8,
): MapBounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  // A single point (or a line) would give a zero extent; keep a sensible minimum span.
  const extentX = Math.max(maxX - minX, 1000);
  const extentY = Math.max(maxY - minY, 1000);
  const scale = Math.min((width * fill) / extentX, (height * fill) / extentY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    minX: cx - width / scale / 2,
    maxX: cx + width / scale / 2,
    minY: cy - height / scale / 2,
    maxY: cy + height / scale / 2,
  };
}
