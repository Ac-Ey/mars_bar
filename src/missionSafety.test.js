import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOxygenBudget, planMission, planEmergency, travelMinutes } from './missionSafety.js';
import { WAYPOINTS } from './missionData.js';
import { isSegmentSafe } from './navigation.js';

const route = (distanceMeters) => ({ blocked: false, distanceMeters });
const budgetInputs = { outboundRoute: route(100), returnRoute: route(200),
  availableOxygenPct: 50, explorationMinutes: 10, reservePct: 15 };
const emergencyInputs = { start: { x: 64, y: 47 }, emergencyType: 'solar_flare',
  waypoints: WAYPOINTS, availableOxygenPct: 79, reservePct: 15 };
const approx = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('oxygen includes independently supplied outbound and return routes, exploration, and reserve', () => {
  const result = calculateOxygenBudget(budgetInputs);
  approx(result.outboundOxygenPct, 1.4);
  approx(result.returnOxygenPct, 2.8);
  approx(result.explorationOxygenPct, 2);
  approx(result.totalOxygenPct, 21.2);
  approx(result.remainingOxygenPct, 43.8);
  assert.equal(result.status, 'GO');
  approx(travelMinutes(72), 1);
});

test('GO, CAUTION, and NO-GO distinguish preserved reserve from insufficient mission oxygen', () => {
  const base = calculateOxygenBudget(budgetInputs);
  for (const [availableOxygenPct, status] of [[base.totalOxygenPct, 'GO'],
    [base.consumptionOxygenPct, 'CAUTION'], [base.consumptionOxygenPct - 0.01, 'NO-GO']]) {
    assert.equal(calculateOxygenBudget({ ...budgetInputs, availableOxygenPct }).status, status);
  }
});

test('reserve and exploration changes directly change total requirements', () => {
  const base = calculateOxygenBudget(budgetInputs);
  const changed = calculateOxygenBudget({ ...budgetInputs, explorationMinutes: 20, reservePct: 25 });
  approx(changed.totalOxygenPct - base.totalOxygenPct, 12);
});

test('zero-distance legs do not impose a fabricated minimum oxygen cost', () => {
  const result = calculateOxygenBudget({ ...budgetInputs, outboundRoute: route(0), returnRoute: route(0),
    explorationMinutes: 0, reservePct: 0, availableOxygenPct: 0 });
  assert.equal(result.totalOxygenPct, 0);
  assert.equal(result.status, 'GO');
});

test('unavailable legs yield NO-GO with unavailable totals', () => {
  for (const leg of ['outboundRoute', 'returnRoute']) {
    const result = calculateOxygenBudget({ ...budgetInputs, [leg]: { blocked: true, reason: 'Blocked terrain' } });
    assert.equal(result.status, 'NO-GO');
    assert.equal(result.totalOxygenPct, null);
    assert.match(result.warnings.join(' '), /route unavailable/);
  }
});

test('invalid calculator inputs cannot yield GO or NaN totals', () => {
  for (const input of [{ availableOxygenPct: NaN }, { availableOxygenPct: -1 }, { availableOxygenPct: 101 },
    { reservePct: 101 }, { reservePct: -1 }, { explorationMinutes: -10 }, { explorationMinutes: Infinity },
    { outboundRoute: route(-1) }, { returnRoute: route(NaN) }]) {
    const result = calculateOxygenBudget({ ...budgetInputs, ...input });
    assert.equal(result.status, 'NO-GO');
    assert.equal(result.totalOxygenPct, null);
  }
});

test('requirements above a full tank remain visible and produce NO-GO', () => {
  const result = calculateOxygenBudget({ ...budgetInputs, explorationMinutes: 1000, availableOxygenPct: 100 });
  assert.ok(result.totalOxygenPct > 100);
  assert.equal(result.status, 'NO-GO');
});

test('mission planner routes from the actual position and returns from the target to HAB-01', () => {
  const result = planMission({ ...budgetInputs, start: { x: 64, y: 47 }, target: WAYPOINTS[2], returnDestination: WAYPOINTS[0] });
  assert.deepEqual(result.outboundRoute.points[0], { x: 64, y: 47 });
  assert.deepEqual(result.returnRoute.points[0], { x: 68, y: 44 });
  assert.deepEqual(result.returnRoute.points.at(-1), { x: 16, y: 78 });
  assert.notEqual(result.outboundRoute.distanceMeters, result.returnRoute.distanceMeters);
});

test('solar flare selects only an explicitly radiation-safe destination', () => {
  const result = planEmergency(emergencyInputs);
  assert.equal(result.destination.id, 'hab');
  assert.equal(result.destination.radiationShelter, true);
  assert.equal(result.feasible, true);
  assert.ok(result.warnings.some((w) => w.includes('not a radiation shelter')));
});

test('oxygen emergency selects the nearest routed oxygen support, not a science waypoint', () => {
  const result = planEmergency({ ...emergencyInputs, emergencyType: 'o2_leak', availableOxygenPct: 41 });
  assert.equal(result.destination.id, 'rover');
  assert.equal(result.destination.oxygenSupport, true);
  const atHab = planEmergency({ ...emergencyInputs, emergencyType: 'o2_leak', start: WAYPOINTS[0] });
  assert.equal(atHab.destination.id, 'hab');
  assert.equal(atHab.route.distanceMeters, 0);
});

test('escape route recomputes from a moved astronaut and handles arrival', () => {
  const first = planEmergency(emergencyInputs);
  const moved = planEmergency({ ...emergencyInputs, start: WAYPOINTS[1] });
  assert.notDeepEqual(first.route.points, moved.route.points);
  assert.ok(moved.route.distanceMeters < first.route.distanceMeters);
  assert.deepEqual(moved.route.points[0], { x: 42, y: 62 });
  const arrived = planEmergency({ ...emergencyInputs, start: WAYPOINTS[0] });
  assert.equal(arrived.route.distanceMeters, 0);
  assert.equal(arrived.oxygenRequiredPct, 0);
  assert.equal(arrived.travelMinutes, 0);
});

test('every emergency segment avoids hazards', () => {
  for (const emergencyType of ['solar_flare', 'o2_leak']) {
    const { points } = planEmergency({ ...emergencyInputs, emergencyType }).route;
    for (let i = 1; i < points.length; i++) assert.ok(isSegmentSafe(points[i - 1], points[i]));
  }
});

test('no eligible or reachable shelter gives an explicit no-safe-route warning', () => {
  for (const overrides of [{ waypoints: [WAYPOINTS[1], WAYPOINTS[2]] },
    { waypoints: [{ ...WAYPOINTS[0], x: 30, y: 30 }] }, { start: { x: 30, y: 30 } },
    { emergencyType: 'unknown' }]) {
    const result = planEmergency({ ...emergencyInputs, ...overrides });
    assert.equal(result.destination, null);
    assert.equal(result.route, null);
    assert.equal(result.feasible, false);
    assert.equal(result.status, 'NO-GO');
    assert.ok(result.warnings.length > 0);
  }
});

test('unreachable nearest shelter is skipped in favor of an eligible reachable shelter', () => {
  const terrain = { blockedPolygons: [[[48, 0], [52, 0], [52, 100], [48, 100]]], dustTraps: [] };
  const result = planEmergency({ ...emergencyInputs, start: { x: 45, y: 50 }, terrain,
    waypoints: [{ id: 'blocked', x: 55, y: 50, radiationShelter: true },
      { id: 'reachable', x: 10, y: 50, radiationShelter: true }] });
  assert.equal(result.destination.id, 'reachable');
});

test('escape distinguishes terrain reachability, oxygen shortage, and reserve usage', () => {
  const good = planEmergency(emergencyInputs);
  const shortage = planEmergency({ ...emergencyInputs, availableOxygenPct: 0 });
  assert.equal(shortage.feasible, false);
  assert.equal(shortage.status, 'NO-GO');
  assert.ok(shortage.route);
  assert.match(shortage.warnings.join(' '), /No oxygen-feasible escape route/);
  const reserve = planEmergency({ ...emergencyInputs, availableOxygenPct: good.oxygenRequiredPct });
  assert.equal(reserve.status, 'CAUTION');
  assert.equal(reserve.feasible, true);
  const invalid = planEmergency({ ...emergencyInputs, availableOxygenPct: NaN });
  assert.equal(invalid.status, 'NO-GO');
  assert.equal(invalid.feasible, false);
});

test('destination ranking uses routed distance rather than straight-line proximity', () => {
  const terrain = { blockedPolygons: [[[48, 0], [52, 0], [52, 80], [48, 80]]], dustTraps: [] };
  const result = planEmergency({ ...emergencyInputs, start: { x: 45, y: 50 }, terrain,
    waypoints: [{ id: 'near-but-detour', x: 55, y: 50, radiationShelter: true },
      { id: 'shorter-route', x: 10, y: 50, radiationShelter: true }] });
  assert.equal(result.destination.id, 'shorter-route');
});
