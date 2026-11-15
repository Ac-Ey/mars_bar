import test from 'node:test';
import assert from 'node:assert/strict';
import { compareRoutes, scienceInfluenceAt, scoreRoute, mixedSpectrum, SCIENCE_PROFILES } from './science.js';
import { isSegmentSafe } from './navigation.js';

test('influence is 1 inside deposits and 0 far away', () => {
  assert.equal(scienceInfluenceAt({ x: 68, y: 44 }), 1);
  assert.equal(scienceInfluenceAt({ x: 5, y: 95 }), 0);
});

test('science-weighted route scores >= safest on science and stays hazard-free', () => {
  const { safest, science } = compareRoutes({ x: 16, y: 78 }, { x: 82, y: 24 });
  assert.ok(!safest.route.blocked && !science.route.blocked);
  assert.ok(science.score.scienceScore >= safest.score.scienceScore);
  for (let i = 1; i < science.route.points.length; i++) {
    assert.ok(isSegmentSafe(science.route.points[i - 1], science.route.points[i]));
  }
});

test('scores are bounded and blocked routes return null', () => {
  const { safest } = compareRoutes({ x: 42, y: 62 }, { x: 68, y: 44 });
  for (const v of [safest.score.scienceScore, safest.score.safetyScore]) assert.ok(v >= 0 && v <= 100);
  assert.equal(scoreRoute({ blocked: true, points: [] }), null);
});

test('SCI-A mixed spectrum shows a 1.91 µm water absorption', () => {
  const s = mixedSpectrum(SCIENCE_PROFILES.alpha.components);
  const at = (um) => s.find((p) => Math.abs(p.um - um) < 0.005).r;
  assert.ok(at(1.91) < at(1.75));
});
