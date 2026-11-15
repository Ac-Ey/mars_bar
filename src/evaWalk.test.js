import test from 'node:test';
import assert from 'node:assert/strict';
import { routeLength, positionAlongRoute, createWalk, advanceWalk, walkPosition, assessReturn } from './evaWalk.js';
import { runAStarRoute } from './navigation.js';
import { travelOxygenPct } from './missionSafety.js';
import { WAYPOINTS } from './missionData.js';

const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const line = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]; // 100 m + 100 m

test('route length and interpolation follow the polyline', () => {
  approx(routeLength(line), 200);
  assert.deepEqual(positionAlongRoute(line, 0), { x: 0, y: 0 });
  assert.deepEqual(positionAlongRoute(line, 50), { x: 5, y: 0 });
  assert.deepEqual(positionAlongRoute(line, 150), { x: 10, y: 5 });
  assert.deepEqual(positionAlongRoute(line, 999), { x: 10, y: 10 });
});

test('walking burns exactly the planner O₂ and stops at the end', () => {
  let w = createWalk(line, 80);
  assert.deepEqual(w.origin, line[0]);
  for (let i = 0; i < 1000 && !w.done; i++) w = advanceWalk(w, 1, 1);
  assert.equal(w.done, true);
  approx(w.walkedMeters, 200);
  approx(w.oxygenPct, 80 - travelOxygenPct(200));
  assert.deepEqual(walkPosition(w), { x: 10, y: 10 });
});

test('speedup scales distance, O₂ never goes below zero', () => {
  const w = advanceWalk(createWalk(line, 1), 10, 5); // 60 m
  approx(w.walkedMeters, 60);
  const drained = advanceWalk(createWalk(line, 0.1), 100, 1);
  assert.equal(drained.oxygenPct, 0);
});

test('empty or zero-length route is immediately done', () => {
  assert.equal(createWalk([{ x: 1, y: 1 }], 50).done, true);
});

test('invalid route and oxygen inputs cannot start a walk', () => {
  assert.throws(() => createWalk([{ x: 1, y: 1 }, { x: 101, y: 1 }], 50), RangeError);
  assert.throws(() => createWalk([{ x: 1, y: 1 }, { x: 2, y: 2 }], NaN), RangeError);
  assert.throws(() => advanceWalk(createWalk(line, 50), -1), RangeError);
});

test('assessReturn: OK -> WARNING -> TURN_BACK -> CRITICAL as O₂ falls', () => {
  const position = { x: 68, y: 44 }; // SCI-A
  const home = WAYPOINTS[0];
  const need = travelOxygenPct(runAStarRoute(position, home).distanceMeters);
  const at = (o2) => assessReturn({ position, availableOxygenPct: o2, reservePct: 15, home }).status;
  assert.equal(at(need + 15 + 20), 'OK');
  assert.equal(at(need + 15 + 3), 'WARNING');
  assert.equal(at(need + 15 - 1), 'TURN_BACK');
  assert.equal(at(need - 1), 'CRITICAL');
});

test('invalid oxygen or reserve cannot be reported as a safe return', () => {
  for (const [availableOxygenPct, reservePct] of [[NaN, 15], [80, NaN], [101, 15]]) {
    assert.equal(assessReturn({
      position: { x: 68, y: 44 }, availableOxygenPct, reservePct, home: WAYPOINTS[0],
    }).status, 'CRITICAL');
  }
});

test('assessReturn reports NO_ROUTE from hazardous terrain', () => {
  const r = assessReturn({ position: { x: 30, y: 30 }, availableOxygenPct: 80, reservePct: 15, home: WAYPOINTS[0] });
  assert.equal(r.status, 'NO_ROUTE');
});
