// Switches the whole app's pathfinding to the real HiRISE-derived hazard grid.
// Import this once in main.jsx BEFORE App.jsx. Source: USGS HiRISE DTM mosaic, 5 m slope baseline, >15° blocked.
import data from './data/jezeroTerrain.json';
import { createGridTerrain, setDefaultTerrain } from './navigation.js';

export const JEZERO_TERRAIN = createGridTerrain(data);
export const TERRAIN_INFO = {
  source: data.source,
  centerLatLon: data.centerLatLon,
  thresholdDeg: data.thresholdDeg,
  maxSlopeDeg: data.maxSlopeDeg,
  elevationMinMax: data.elevationMinMax,
};
setDefaultTerrain(JEZERO_TERRAIN);
