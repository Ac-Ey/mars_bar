// Field-science model: CRISM deposits, synthetic spectra, instrument scans and route scoring.
// All values are illustrative simulation inputs inspired by published Jezero spectroscopy,
// not calibrated NASA measurements.
import { runAStarRoute, SLOPE_HAZARDS, DUST_TRAP, METERS_PER_MAP_UNIT, DEFAULT_TERRAIN } from './navigation.js';

export const TUBE_CAPACITY = 10;
export const TUBE_MASS_KG = { core: 0.12, regolith: 0.09 }; // tube + sample, simulated
export const SCIENCE_TASK_MINUTES = { core: 12, regolith: 5, SHERLOC: 6, PIXL: 8, SuperCam: 3 };

export const MINERAL_DEPOSITS = [
  { id: 'silica', label: 'CRISM: HYDRATED SILICA', mineral: 'Hydrated Silica', cx: 68, cy: 44, rx: 11, ry: 7,
    weight: 1.0, color: '#22d3ee', fill: 'rgba(34, 211, 238, 0.28)', labelPos: [59, 35.5] },
  { id: 'carbonate', label: 'MG-CARBONATES', mineral: 'Mg-Carbonates', cx: 82, cy: 24, rx: 9, ry: 6,
    weight: 0.85, color: '#2dd4bf', fill: 'rgba(45, 212, 191, 0.28)', labelPos: [73, 16.5] },
];

// Influence 1 inside a deposit footprint, fading linearly to 0 at 2.5 radii.
export function depositInfluence(p, d) {
  const n = Math.hypot((p.x - d.cx) / d.rx, (p.y - d.cy) / d.ry);
  return n <= 1 ? 1 : Math.max(0, 1 - (n - 1) / 1.5);
}

export const scienceInfluenceAt = (p) =>
  Math.max(0, ...MINERAL_DEPOSITS.map((d) => depositInfluence(p, d) * d.weight));

// ---------- Spectral library (VNIR/SWIR reflectance, 1.0 – 2.6 µm) ----------
export const SPECTRAL_LIBRARY = {
  hydratedSilica: { name: 'Hydrated Silica (Opal-A/CT)', color: '#22d3ee',
    bands: [{ um: 1.41, depth: 0.10, width: 0.04, cause: 'Si-OH / H₂O overtone' },
      { um: 1.91, depth: 0.14, width: 0.05, cause: 'Molecular H₂O combination' },
      { um: 2.21, depth: 0.13, width: 0.09, cause: 'Si-OH broad combination (diagnostic)' }] },
  phyllosilicate: { name: 'Fe/Mg Smectite Clay', color: '#a78bfa',
    bands: [{ um: 1.41, depth: 0.07, width: 0.03, cause: 'OH stretch overtone' },
      { um: 1.91, depth: 0.11, width: 0.04, cause: 'Interlayer H₂O' },
      { um: 2.30, depth: 0.10, width: 0.03, cause: 'Fe/Mg-OH combination (diagnostic)' }] },
  sulfate: { name: 'Polyhydrated Sulfate', color: '#facc15',
    bands: [{ um: 1.94, depth: 0.12, width: 0.05, cause: 'Bound H₂O' },
      { um: 2.42, depth: 0.08, width: 0.04, cause: 'S-O / H₂O combination' }] },
  carbonate: { name: 'Mg-Carbonate (Magnesite)', color: '#2dd4bf',
    bands: [{ um: 2.30, depth: 0.12, width: 0.04, cause: 'CO₃ overtone (diagnostic)' },
      { um: 2.50, depth: 0.15, width: 0.05, cause: 'CO₃ combination (diagnostic)' },
      { um: 1.91, depth: 0.04, width: 0.04, cause: 'Minor adsorbed H₂O' }] },
  olivine: { name: 'Olivine', color: '#84cc16',
    bands: [{ um: 1.05, depth: 0.18, width: 0.22, cause: 'Fe²⁺ crystal-field (broad)' }] },
  basalt: { name: 'Pyroxene-rich Basalt', color: '#f97316',
    bands: [{ um: 1.00, depth: 0.10, width: 0.12, cause: 'Fe²⁺ M1/M2 band I' },
      { um: 2.05, depth: 0.08, width: 0.25, cause: 'Fe²⁺ band II' }] },
};

// Per-waypoint science profile.
export const SCIENCE_PROFILES = {
  hab: { coreable: false, priority: 12,
    components: [{ key: 'basalt', pct: 78 }, { key: 'olivine', pct: 22 }],
    factors: [{ label: 'Aqueous alteration', score: 2 }, { label: 'Organic preservation', score: 2 },
      { label: 'Context value', score: 6 }, { label: 'Access / safety', score: 2 }],
    pixl: { SiO2: 46.1, FeO: 19.8, MgO: 9.4, SO3: 1.2, CaO: 7.9 },
    sherloc: 'No organic fluorescence above detection floor.',
    supercam: 'LIBS: basaltic Mg/Fe ratio; no H emission line.' },
  rover: { coreable: false, priority: 31,
    components: [{ key: 'olivine', pct: 64 }, { key: 'basalt', pct: 28 }, { key: 'carbonate', pct: 8 }],
    factors: [{ label: 'Aqueous alteration', score: 7 }, { label: 'Organic preservation', score: 4 },
      { label: 'Context value', score: 12 }, { label: 'Access / safety', score: 8 }],
    pixl: { SiO2: 41.3, FeO: 21.5, MgO: 24.9, SO3: 0.8, CaO: 3.1 },
    sherloc: 'Weak 280 nm fluorescence; likely mineral luminescence.',
    supercam: 'LIBS: high Mg olivine cumulate; trace carbonate rinds.' },
  alpha: { coreable: true, priority: 98,
    components: [{ key: 'hydratedSilica', pct: 46 }, { key: 'phyllosilicate', pct: 31 }, { key: 'sulfate', pct: 23 }],
    factors: [{ label: 'Aqueous alteration', score: 30 }, { label: 'Organic preservation', score: 34 },
      { label: 'Context value', score: 22 }, { label: 'Access / safety', score: 12 }],
    rationale: 'Opaline silica + Fe/Mg clays in fine laminated mudstone: rapid silica entombment is the ' +
      'best-known terrestrial preservation pathway for microbial textures and organics.',
    pixl: { SiO2: 71.4, FeO: 6.2, MgO: 5.1, SO3: 8.7, CaO: 2.3 },
    sherloc: 'Raman G-band (~1600 cm⁻¹) + 340 nm fluorescence: candidate aromatic organics.',
    supercam: 'LIBS: strong H 656 nm line, elevated Si — hydrated silica confirmed.' },
  beta: { coreable: true, priority: 86,
    components: [{ key: 'carbonate', pct: 58 }, { key: 'phyllosilicate', pct: 30 }, { key: 'olivine', pct: 12 }],
    factors: [{ label: 'Aqueous alteration', score: 27 }, { label: 'Organic preservation', score: 26 },
      { label: 'Context value', score: 24 }, { label: 'Access / safety', score: 9 }],
    rationale: 'Mg-carbonates at the delta margin record lake chemistry and can trap organics and ' +
      'stromatolite-like fabrics; steep talus lowers accessibility score.',
    pixl: { SiO2: 38.2, FeO: 11.4, MgO: 28.6, SO3: 1.9, CaO: 4.4 },
    sherloc: 'Raman 1090 cm⁻¹ carbonate peak; faint fluorescence at grain boundaries.',
    supercam: 'LIBS: Mg + C emission; VISIR 2.30 / 2.50 µm doublet.' },
};

export const WAVELENGTHS = Array.from({ length: 161 }, (_, i) => 1.0 + i * 0.01);

export function reflectanceFor(key, um) {
  const spec = SPECTRAL_LIBRARY[key];
  const continuum = 0.32 + 0.05 * (um - 1.0);
  const absorb = spec.bands.reduce((s, b) => s + b.depth * Math.exp(-(((um - b.um) / b.width) ** 2)), 0);
  return continuum * (1 - absorb);
}

export function mixedSpectrum(components) {
  return WAVELENGTHS.map((um) => ({
    um, r: components.reduce((s, c) => s + (c.pct / 100) * reflectanceFor(c.key, um), 0),
  }));
}

// ---------- Route scoring ----------
function samplePolyline(points, step = 0.5) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n, seg: len / n });
  }
  if (points.length) out.push({ ...points[points.length - 1], seg: 0 });
  return out;
}

const distToSegment = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy));
};

export function hazardClearance(p) {
  let best = Math.hypot(p.x - DUST_TRAP.x, p.y - DUST_TRAP.y) - DUST_TRAP.radius;
  for (const poly of SLOPE_HAZARDS) {
    for (let i = 0; i < poly.length; i++) best = Math.min(best, distToSegment(p, poly[i], poly[(i + 1) % poly.length]));
  }
  return Math.max(0, best);
}

export function scoreRoute(route, referenceDistance) {
  if (!route || route.blocked || route.points.length < 2) return null;
  const samples = samplePolyline(route.points);
  const peaks = MINERAL_DEPOSITS.map((d) => ({
    id: d.id, mineral: d.mineral, peak: Math.max(...samples.map((s) => depositInfluence(s, d))),
    closestMeters: Math.max(0, Math.min(...samples.map((s) =>
      (Math.hypot((s.x - d.cx) / d.rx, (s.y - d.cy) / d.ry) - 1) * Math.min(d.rx, d.ry))) * METERS_PER_MAP_UNIT),
  }));
  const totalW = MINERAL_DEPOSITS.reduce((s, d) => s + d.weight, 0);
  const proximity = peaks.reduce((s, p, i) => s + p.peak * MINERAL_DEPOSITS[i].weight, 0) / totalW;
  const dwellMeters = samples.reduce((s, p) => s + (scienceInfluenceAt(p) >= 0.5 ? p.seg : 0), 0) * METERS_PER_MAP_UNIT;
  const scienceScore = Math.round(100 * (0.75 * proximity + 0.25 * Math.min(1, dwellMeters / 300)));

  const minClearanceMeters = Math.min(...samples.map(hazardClearance)) * METERS_PER_MAP_UNIT;
  const efficiency = referenceDistance ? Math.min(1, referenceDistance / route.distanceMeters) : 1;
  const safetyScore = Math.round(70 * Math.min(1, minClearanceMeters / 80) + 30 * efficiency);

  return { scienceScore, safetyScore, proximity, dwellMeters, minClearanceMeters, peaks, distanceMeters: route.distanceMeters };
}

export function compareRoutes(start, end, terrain = DEFAULT_TERRAIN) {
  const safest = runAStarRoute(start, end, terrain);
  const science = runAStarRoute(start, end, terrain, {
    costMultiplier: (p) => 1 - 0.6 * scienceInfluenceAt(p), minMultiplier: 0.4,
  });
  const ref = safest.blocked ? null : safest.distanceMeters;
  return {
    safest: { route: safest, score: scoreRoute(safest, ref) },
    science: { route: science, score: scoreRoute(science, ref) },
  };
}
