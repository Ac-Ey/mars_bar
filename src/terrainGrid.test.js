import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGridTerrain, runAStarRoute, isSegmentSafe, setDefaultTerrain, DEFAULT_TERRAIN, GRID_SIZE } from './navigation.js';
import { planEmergency } from './missionSafety.js';
import { WAYPOINTS } from './missionData.js';

const data = JSON.parse(readFileSync(new URL('./data/jezeroTerrain.json', import.meta.url), 'utf8'));
const real = createGridTerrain(data);
const cell = (p) => ({ gx: Math.min(GRID_SIZE - 1, Math.floor(p.x / 2)), gy: Math.min(GRID_SIZE - 1, Math.floor(p.y / 2)) });
afterEach(() => setDefaultTerrain(null));

test('grid terrain rejects malformed input', () => {
  assert.throws(() => createGridTerrain({ rows: ['0101'] }));
  assert.throws(() => createGridTerrain({ rows: Array(50).fill('0'.repeat(49)) }));
});

test('every waypoint sits on an unblocked cell of the real terrain', () => {
  for (const wp of WAYPOINTS) {
    const { gx, gy } = cell(wp);
    assert.equal(real.blockedGrid[gy][gx], false, `${wp.code} is on a blocked cell`);
  }
});

test('all waypoint pairs are routable and no route sample touches a blocked cell', () => {
  for (const a of WAYPOINTS) for (const b of WAYPOINTS) {
    const route = runAStarRoute(a, b, real);
    assert.equal(route.blocked, false, `${a.code} -> ${b.code}: ${route.reason}`);
    for (let i = 1; i < route.points.length; i++) assert.ok(isSegmentSafe(route.points[i - 1], route.points[i], real));
    for (const p of route.points) { const { gx, gy } = cell(p); assert.equal(real.blockedGrid[gy][gx], false); }
  }
});

test('blocked cells reject start and target without a fake distance', () => {
  const blockedPoint = { x: 2 * 33 + 1, y: 2 * 18 + 1 }; // row 18, col 33 is '1'
  assert.equal(real.blockedGrid[18][33], true);
  for (const r of [runAStarRoute(WAYPOINTS[0], blockedPoint, real), runAStarRoute(blockedPoint, WAYPOINTS[0], real)]) {
    assert.equal(r.blocked, true);
    assert.equal(r.distanceMeters, null);
  }
});

test('cliff band forces a detour longer than the straight line', () => {
  const from = { x: 50, y: 36 }, to = { x: 90, y: 36 }; // crosses the cliff cluster near cols 33-36 / 43-46
  const route = runAStarRoute(from, to, real);
  if (!route.blocked) assert.ok(route.distanceMeters > 40 * 10);
});

test('default terrain can be swapped and restored', () => {
  const blockedPoint = { x: 67, y: 37 };
  assert.equal(isSegmentSafe(blockedPoint, blockedPoint), isSegmentSafe(blockedPoint, blockedPoint, DEFAULT_TERRAIN));
  setDefaultTerrain(real);
  assert.equal(isSegmentSafe(blockedPoint, blockedPoint), false);
  setDefaultTerrain(null);
  assert.equal(isSegmentSafe(blockedPoint, blockedPoint), isSegmentSafe(blockedPoint, blockedPoint, DEFAULT_TERRAIN));
});

test('emergency planning works on real terrain from every waypoint', () => {
  for (const start of WAYPOINTS) {
    const r = planEmergency({ start, emergencyType: 'solar_flare', waypoints: WAYPOINTS,
      availableOxygenPct: 79, reservePct: 15, terrain: real });
    assert.equal(r.destination.id, 'hab');
    assert.ok(r.route && !r.route.blocked);
  }
});
