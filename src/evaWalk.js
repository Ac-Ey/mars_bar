import { METERS_PER_MAP_UNIT, runAStarRoute } from './navigation.js';
import { SIMULATION_MODEL, travelOxygenPct } from './missionSafety.js';

// Slack (O₂ % above return cost + reserve) below which we show an early warning.
export const WARNING_SLACK_PCT = 5;

export const routeLength = (points) => points.reduce((sum, p, i) => i === 0 ? 0 :
  sum + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) * METERS_PER_MAP_UNIT, 0);

// Position (map %) after walking `meters` along a polyline.
export function positionAlongRoute(points, meters) {
  if (!points.length) return null;
  let left = Math.max(0, meters);
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) * METERS_PER_MAP_UNIT;
    if (left <= seg && seg > 0) {
      const t = left / seg;
      return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t };
    }
    left -= seg;
  }
  const last = points.at(-1);
  return { x: last.x, y: last.y };
}

export function createWalk(points, oxygenPct) {
  if (!Array.isArray(points) || points.length === 0 ||
    points.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
      point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100)) {
    throw new RangeError('A walk requires valid route points.');
  }
  if (!Number.isFinite(oxygenPct) || oxygenPct < 0 || oxygenPct > 100) {
    throw new RangeError('Starting oxygen must be between 0 and 100%.');
  }
  const totalMeters = routeLength(points);
  return {
    points, origin: { ...points[0] }, totalMeters, walkedMeters: 0,
    oxygenPct, startingOxygenPct: oxygenPct,
    done: points.length < 2 || totalMeters === 0,
  };
}

// Pure step: moves along the route and burns O₂ with the same coefficients as the planner.
export function advanceWalk(walk, dtSeconds, speedup = 1) {
  if (walk.done) return walk;
  if (!Number.isFinite(dtSeconds) || dtSeconds < 0 ||
    !Number.isFinite(speedup) || speedup <= 0) {
    throw new RangeError('Walk time and speed must be valid positive values.');
  }
  const step = Math.min(dtSeconds * speedup * SIMULATION_MODEL.walkingSpeedMps,
    walk.totalMeters - walk.walkedMeters);
  const walkedMeters = walk.walkedMeters + step;
  return { ...walk, walkedMeters,
    oxygenPct: Math.max(0, walk.startingOxygenPct - travelOxygenPct(walkedMeters)),
    done: walkedMeters >= walk.totalMeters - 1e-9 };
}

export const walkPosition = (walk) => positionAlongRoute(walk.points, walk.walkedMeters);

// Point-of-no-return check: can the astronaut still get home AND keep the reserve?
// slack = O₂ − return cost − reserve.
export function assessReturn({ position, availableOxygenPct, reservePct, home, terrain }) {
  if (!Number.isFinite(availableOxygenPct) || availableOxygenPct < 0 || availableOxygenPct > 100 ||
    !Number.isFinite(reservePct) || reservePct < 0 || reservePct > 100) {
    return { status: 'CRITICAL', route: null, returnOxygenPct: null, slackPct: null };
  }
  const route = runAStarRoute(position, home, terrain);
  if (route.blocked) return { status: 'NO_ROUTE', route, returnOxygenPct: null, slackPct: null };
  const returnOxygenPct = travelOxygenPct(route.distanceMeters);
  const slackPct = availableOxygenPct - returnOxygenPct - reservePct;
  const status = availableOxygenPct < returnOxygenPct ? 'CRITICAL'
    : slackPct <= 0 ? 'TURN_BACK'
    : slackPct <= WARNING_SLACK_PCT ? 'WARNING' : 'OK';
  return { status, route, returnOxygenPct, slackPct };
}
