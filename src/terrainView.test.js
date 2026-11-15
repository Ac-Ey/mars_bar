import test from 'node:test';
import assert from 'node:assert/strict';
import { blockedRects } from './terrainView.js';
import { GRID_SIZE } from './navigation.js';

test('blocked grid rows become merged map rectangles', () => {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  grid[0][1] = true;
  grid[0][2] = true;
  grid[2][49] = true;
  assert.deepEqual(blockedRects({ blockedGrid: grid }), [
    { x: 2, y: 0, w: 4, h: 2 },
    { x: 98, y: 4, w: 2, h: 2 },
  ]);
});

test('terrain without a blocked grid renders no hazard rectangles', () => {
  assert.deepEqual(blockedRects({ blockedPolygons: [], dustTraps: [] }), []);
});

test('malformed blocked grids are rejected', () => {
  assert.throws(() => blockedRects({ blockedGrid: [[true]] }), /Terrain grid must be 50 x 50/);
});
