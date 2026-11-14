import test from 'node:test';
import assert from 'node:assert/strict';
import { runAStarRoute, isSegmentSafe, pointInPolygon, DEFAULT_TERRAIN, METERS_PER_MAP_UNIT } from './navigation.js';
import { WAYPOINTS } from './missionData.js';

const emptyTerrain = { blockedPolygons: [], dustTraps: [] };
const start = { x: 64, y: 47 };

function assertSafeRoute(route, from, to, terrain = DEFAULT_TERRAIN) {
  assert.equal(route.blocked, false, route.reason);
  assert.deepEqual(route.points[0], { x: from.x, y: from.y });
  assert.deepEqual(route.points.at(-1), { x: to.x, y: to.y });
  let distance = 0;
  for (let i = 1; i < route.points.length; i++) {
    assert.ok(isSegmentSafe(route.points[i - 1], route.points[i], terrain), `Unsafe segment ${i}`);
    distance += Math.hypot(route.points[i].x - route.points[i - 1].x,
      route.points[i].y - route.points[i - 1].y) * METERS_PER_MAP_UNIT;
  }
  assert.ok(Math.abs(distance - route.distanceMeters) < 1e-8);
}

test('routes from each simulated astronaut location to every existing waypoint', () => {
  for (const from of [start, WAYPOINTS[1]]) {
    for (const to of WAYPOINTS) assertSafeRoute(runAStarRoute(from, to), from, to);
  }
});

test('route detours around both slope polygons and never crosses their boundaries', () => {
  for (const [from, to] of [[{ x: 12, y: 30 }, { x: 54, y: 30 }],
    [{ x: 70, y: 56 }, { x: 99, y: 56 }]]) {
    const route = runAStarRoute(from, to);
    assertSafeRoute(route, from, to);
    assert.ok(route.distanceMeters > Math.hypot(to.x - from.x, to.y - from.y) * METERS_PER_MAP_UNIT);
  }
});

test('dust trap is blocked, with a safe detour independent of overlay visibility', () => {
  const from = { x: 30, y: 82 }, to = { x: 70, y: 82 };
  const route = runAStarRoute(from, to);
  assertSafeRoute(route, from, to);
  assert.ok(route.distanceMeters > 400);
  assert.equal(runAStarRoute(start, { x: 50, y: 82 }).blocked, true);
});

test('rejects hazardous start and end positions without reporting a misleading zero distance', () => {
  for (const hazard of [{ x: 30, y: 30 }, { x: 84, y: 56 }, { x: 50, y: 82 }]) {
    for (const route of [runAStarRoute(start, hazard), runAStarRoute(hazard, start)]) {
      assert.equal(route.blocked, true);
      assert.equal(route.distanceMeters, null);
      assert.deepEqual(route.points, []);
    }
  }
});

test('same-cell routing retains both exact positions and charges actual distance', () => {
  const from = { x: 10.1, y: 10.2 }, to = { x: 11.2, y: 11.3 };
  assertSafeRoute(runAStarRoute(from, to), from, to);
  const arrived = runAStarRoute(from, from);
  assertSafeRoute(arrived, from, from);
  assert.equal(arrived.distanceMeters, 0);
});

test('invalid/out-of-map positions are rejected rather than clamped', () => {
  for (const point of [null, { x: NaN, y: 10 }, { x: Infinity, y: 10 },
    { x: -1, y: 10 }, { x: 10, y: 101 }]) {
    assert.equal(runAStarRoute(point, start).blocked, true);
    assert.equal(runAStarRoute(start, point).blocked, true);
  }
  assertSafeRoute(runAStarRoute({ x: 0, y: 0 }, { x: 100, y: 100 }, emptyTerrain),
    { x: 0, y: 0 }, { x: 100, y: 100 }, emptyTerrain);
});

test('an impassable wall produces an unavailable route', () => {
  const terrain = { blockedPolygons: [[[48, 0], [52, 0], [52, 100], [48, 100]]], dustTraps: [] };
  const route = runAStarRoute({ x: 10, y: 50 }, { x: 90, y: 50 }, terrain);
  assert.equal(route.blocked, true);
  assert.match(route.reason, /No connected route/);
});

test('cannot cut diagonally between two blocked neighboring cells', () => {
  const terrain = { blockedPolygons: [
    [[2.2, 0.2], [3.8, 0.2], [3.8, 1.8], [2.2, 1.8]],
    [[0.2, 2.2], [1.8, 2.2], [1.8, 3.8], [0.2, 3.8]],
  ], dustTraps: [] };
  assert.equal(runAStarRoute({ x: 1, y: 1 }, { x: 5, y: 5 }, terrain).blocked, true);
});

test('checks exact-position connectors and hazard boundaries, including sub-cell hazards', () => {
  const terrain = { blockedPolygons: [[[10.1, 10.1], [10.4, 10.1], [10.4, 10.4], [10.1, 10.4]]], dustTraps: [] };
  assert.equal(runAStarRoute({ x: 10.2, y: 10.2 }, { x: 20, y: 20 }, terrain).blocked, true);
  assert.equal(pointInPolygon({ x: 22, y: 22 }, DEFAULT_TERRAIN.blockedPolygons[0]), true);
  assert.equal(isSegmentSafe({ x: 39, y: 82 }, { x: 39, y: 82 }), false);
  assert.equal(isSegmentSafe({ x: 0, y: 30 }, { x: 60, y: 30 }), false);
});
