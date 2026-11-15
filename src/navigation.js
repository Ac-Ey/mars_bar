// Schematic 1 km × 1 km map, retaining the original 50 × 50 A* grid.
// These coordinates and the distance scale are simulation inputs, not a HiRISE calibration.
export const GRID_SIZE = 50;
export const METERS_PER_MAP_UNIT = 10;
export const SLOPE_HAZARDS = [
  [[22, 22], [42, 20], [44, 38], [24, 39]],
  [[74, 48], [92, 46], [95, 68], [76, 66]],
];
export const DUST_TRAP = { x: 50, y: 82, radius: 11 };
export const DEFAULT_TERRAIN = { blockedPolygons: SLOPE_HAZARDS, dustTraps: [DUST_TRAP] };

// The terrain used when a caller passes none. Starts as the simulated terrain above;
// call setDefaultTerrain(createGridTerrain(...)) once at startup to use real DEM-derived hazards.
let activeTerrain = DEFAULT_TERRAIN;
export const setDefaultTerrain = (terrain) => { activeTerrain = terrain ?? DEFAULT_TERRAIN; };
export const getDefaultTerrain = () => activeTerrain;

// Build terrain from the 50x50 hazard grid written by make_terrain.py (rows of '0'/'1', row 0 = top/north).
export function createGridTerrain({ rows, dustTraps = [] }) {
  if (!Array.isArray(rows) || rows.length !== GRID_SIZE || rows.some((r) => r.length !== GRID_SIZE)) {
    throw new Error(`Terrain grid must be ${GRID_SIZE} x ${GRID_SIZE}.`);
  }
  return { blockedPolygons: [], dustTraps, blockedGrid: rows.map((r) => Array.from(r, (ch) => ch === '1')) };
}

const gridCellBlocked = (terrain, gx, gy) => terrain.blockedGrid?.[gy]?.[gx] === true;

// Sample along the segment; each sample belongs to the cell floor(x / cellSize), matching the router.
function isSegmentClearOfGrid(a, b, terrain) {
  if (!terrain.blockedGrid) return true;
  const cellSize = 100 / GRID_SIZE;
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / cellSize / 0.02));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const gx = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor((a.x + (b.x - a.x) * t) / cellSize)));
    const gy = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor((a.y + (b.y - a.y) * t) / cellSize)));
    if (gridCellBlocked(terrain, gx, gy)) return false;
  }
  return true;
}

const EPSILON = 1e-9;
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const onSegment = (a, b, p) => Math.abs(cross(a, b, p)) < EPSILON &&
  p.x >= Math.min(a.x, b.x) - EPSILON && p.x <= Math.max(a.x, b.x) + EPSILON &&
  p.y >= Math.min(a.y, b.y) - EPSILON && p.y <= Math.max(a.y, b.y) + EPSILON;

function segmentsIntersect(a, b, c, d) {
  return (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) ||
    onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = { x: polygon[i][0], y: polygon[i][1] };
    const b = { x: polygon[j][0], y: polygon[j][1] };
    if (onSegment(a, b, point)) return true;
    if ((a.y > point.y) !== (b.y > point.y) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// Polygons and dust traps only (the original hazard shapes).
function isSegmentClearOfShapes(a, b, terrain) {
  for (const polygon of terrain.blockedPolygons ?? []) {
    if (pointInPolygon(a, polygon) || pointInPolygon(b, polygon)) return false;
    for (let i = 0; i < polygon.length; i++) {
      const next = polygon[(i + 1) % polygon.length];
      if (segmentsIntersect(a, b, { x: polygon[i][0], y: polygon[i][1] }, { x: next[0], y: next[1] })) return false;
    }
  }
  for (const circle of terrain.dustTraps ?? []) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
      ((circle.x - a.x) * dx + (circle.y - a.y) * dy) / lengthSquared));
    if (Math.hypot(a.x + t * dx - circle.x, a.y + t * dy - circle.y) <= circle.radius + EPSILON) return false;
  }
  return true;
}

// Check complete segments, including exact-position connectors, not only grid centers.
export function isSegmentSafe(a, b, terrain = activeTerrain) {
  return isSegmentClearOfShapes(a, b, terrain) && isSegmentClearOfGrid(a, b, terrain);
}

const validPoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
  p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100;

export function runAStarRoute(startPct, endPct, terrain = activeTerrain) {
  const blocked = (reason) => ({ blocked: true, reason, points: [], distanceMeters: null });
  if (!validPoint(startPct) || !validPoint(endPct)) return blocked('Position is outside the simulation map or invalid.');

  const cellSize = 100 / GRID_SIZE;
  const toGrid = (v) => Math.min(GRID_SIZE - 1, Math.floor(v / cellSize));
  const center = (cell) => ({ x: (cell.x + 0.5) * cellSize, y: (cell.y + 0.5) * cellSize });
  const start = { x: toGrid(startPct.x), y: toGrid(startPct.y) };
  const goal = { x: toGrid(endPct.x), y: toGrid(endPct.y) };
  const key = (x, y) => `${x},${y}`;
  const costCache = new Map();

  function getCellTraversalCost(gx, gy) {
    const id = key(gx, gy);
    if (costCache.has(id)) return costCache.get(id);
    const x = gx * cellSize, y = gy * cellSize;
    const corners = [{ x, y }, { x: x + cellSize, y },
      { x: x + cellSize, y: y + cellSize }, { x, y: y + cellSize }];
    // Conservatively block any cell touched by a hazard, including small hazards
    // entirely inside the cell. Layer switches only control visibility.
    const safe = !gridCellBlocked(terrain, gx, gy) &&
      corners.every((p, i) => isSegmentClearOfShapes(p, corners[(i + 1) % 4], terrain)) &&
      !(terrain.blockedPolygons ?? []).some((poly) => poly.some(([px, py]) =>
        px >= x && px <= x + cellSize && py >= y && py <= y + cellSize)) &&
      !(terrain.dustTraps ?? []).some((c) => c.x >= x && c.x <= x + cellSize && c.y >= y && c.y <= y + cellSize);
    const p = center({ x: gx, y: gy });
    const cost = safe ? (Math.hypot(p.x - 68, p.y - 44) < 9 ? 0.85 : 1) : Infinity;
    costCache.set(id, cost);
    return cost;
  }

  if (getCellTraversalCost(start.x, start.y) === Infinity || !isSegmentSafe(startPct, center(start), terrain)) {
    return blocked('Current position is in hazardous terrain or a grid cell touching a hazard.');
  }
  if (getCellTraversalCost(goal.x, goal.y) === Infinity || !isSegmentSafe(center(goal), endPct, terrain)) {
    return blocked('Destination is in hazardous terrain or a grid cell touching a hazard.');
  }

  const openSet = [start];
  const cameFrom = new Map();
  const gScore = new Map([[key(start.x, start.y), 0]]);
  // 0.85 is the minimum traversal cost, keeping the A* heuristic admissible.
  const heuristic = (cell) => 0.85 * Math.hypot(goal.x - cell.x, goal.y - cell.y);
  const fScore = new Map([[key(start.x, start.y), heuristic(start)]]);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  while (openSet.length) {
    openSet.sort((a, b) => fScore.get(key(a.x, a.y)) - fScore.get(key(b.x, b.y)));
    const current = openSet.shift();
    if (current.x === goal.x && current.y === goal.y) {
      const cells = [current];
      let currKey = key(current.x, current.y);
      while (cameFrom.has(currKey)) {
        const prev = cameFrom.get(currKey);
        cells.unshift(prev);
        currKey = key(prev.x, prev.y);
      }
      const sameCell = cells.length === 1;
      const rawPoints = sameCell ? [startPct, endPct] : [startPct, ...cells.map(center), endPct];
      const points = rawPoints.filter((p, i) => i === 0 || p.x !== rawPoints[i - 1].x || p.y !== rawPoints[i - 1].y)
        .map(({ x, y }) => ({ x, y }));
      const distanceMeters = points.reduce((sum, p, i) => i === 0 ? 0 :
        sum + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) * METERS_PER_MAP_UNIT, 0);
      return { blocked: false, points, distanceMeters };
    }

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx, ny = current.y + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      const cellCost = getCellTraversalCost(nx, ny);
      if (cellCost === Infinity) continue;
      // A diagonal may not squeeze between blocked orthogonal neighbors.
      if (dx && dy && (getCellTraversalCost(current.x + dx, current.y) === Infinity ||
        getCellTraversalCost(current.x, current.y + dy) === Infinity)) continue;
      const tentativeG = gScore.get(key(current.x, current.y)) + Math.hypot(dx, dy) * cellCost;
      const nKey = key(nx, ny);
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        const next = { x: nx, y: ny };
        cameFrom.set(nKey, current);
        gScore.set(nKey, tentativeG);
        fScore.set(nKey, tentativeG + heuristic(next));
        if (!openSet.some((n) => n.x === nx && n.y === ny)) openSet.push(next);
      }
    }
  }
  return blocked('No connected route through unblocked terrain.');
}
