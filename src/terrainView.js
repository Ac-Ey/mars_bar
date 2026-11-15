import { GRID_SIZE } from './navigation.js';

export function blockedRects(terrain) {
  const grid = terrain?.blockedGrid;
  if (!grid) return [];
  if (!Array.isArray(grid) || grid.length !== GRID_SIZE ||
    grid.some((row) => !Array.isArray(row) || row.length !== GRID_SIZE)) {
    throw new Error(`Terrain grid must be ${GRID_SIZE} x ${GRID_SIZE}.`);
  }

  const cellSize = 100 / GRID_SIZE;
  const rects = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    let x = 0;
    while (x < GRID_SIZE) {
      if (!grid[y][x]) {
        x++;
        continue;
      }

      const startX = x;
      while (x < GRID_SIZE && grid[y][x]) x++;
      rects.push({
        x: startX * cellSize,
        y: y * cellSize,
        w: (x - startX) * cellSize,
        h: cellSize,
      });
    }
  }
  return rects;
}
