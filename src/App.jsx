import React, { useState, useMemo } from 'react';
import {
  Layers,
  ShieldAlert,
  Navigation,
  Radio,
  Activity,
  Battery,
  Wind,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Compass,
  RotateCcw,
  Sparkles,
  MapPin,
  Maximize2,
  X,
  Sliders,
  Crosshair,
  Map as MapIcon,
  Scan
} from 'lucide-react';

const WAYPOINTS = [
  {
    id: 'hab',
    name: 'Ares Base Airlock',
    code: 'HAB-01',
    type: 'Habitat / Safe Haven',
    x: 16,
    y: 78,
    elevation: '-2,568 m',
    slope: '2.1°',
    pitchDeg: 2.1,
    headingDeg: 228,
    distanceStr: '610 m',
    radiation: '0.02 mSv/hr (Shielded)',
    minerals: 'Regolith Berm / Basaltic Sand',
    povImage: '/nasa/pov_hab.jpeg',
    povInstrument: 'MASTCAM-Z • SOL 12',
    povTitle: 'Landing Site Perimeter & Basaltic Plain',
    povDesc: 'Flat basaltic plains with low boulder density. Pressurized airlock and full radiation shelter available.',
    scienceValue: 'Base Operations'
  },
  {
    id: 'rover',
    name: 'Scout Rover Relay (ATHLETE-2)',
    code: 'RVR-04',
    type: 'Mobile Comms & O₂ Cache',
    x: 42,
    y: 62,
    elevation: '-2,554 m',
    slope: '4.8°',
    pitchDeg: 4.8,
    headingDeg: 236,
    distanceStr: '265 m',
    radiation: '0.18 mSv/hr',
    minerals: 'Olivine-bearing Cumulate',
    povImage: '/nasa/pov_rover.jpeg',
    povInstrument: 'NAVCAM RIGHT • SOL 89',
    povTitle: 'Companion Rover & 500m UHF Mesh Relay',
    povDesc: 'Uncrewed support rover carrying spare PLSS oxygen tanks, core sample storage, and high-gain orbital relay.',
    scienceValue: 'Logistics & Relay'
  },
  {
    id: 'alpha',
    name: 'Bright Angel Outcrop',
    code: 'SCI-A',
    type: 'Primary Biosignature Target',
    x: 68,
    y: 44,
    elevation: '-2,531 m',
    slope: '11.4° (Caution)',
    pitchDeg: 11.4,
    headingDeg: 54,
    distanceStr: '48 m',
    radiation: '0.24 mSv/hr',
    minerals: 'Hydrated Silica, Sulfates, Phyllosilicates',
    povImage: '/nasa/pov_alpha.jpeg',
    povInstrument: 'SUPERCAM RMI • SOL 1175',
    povTitle: 'Light-Toned Layered Mudstone Outcrop',
    povDesc: 'Fine-grained laminated sedimentary outcrop showing high hydration signatures in CRISM spectral bands.',
    scienceValue: '98% Priority — Core Drill Target'
  },
  {
    id: 'beta',
    name: 'Neretha Rim Ridge',
    code: 'SCI-B',
    type: 'Secondary Carbonate Target',
    x: 82,
    y: 24,
    elevation: '-2,509 m',
    slope: '14.2° (Near Suit Limit)',
    pitchDeg: 14.2,
    headingDeg: 38,
    distanceStr: '295 m',
    radiation: '0.31 mSv/hr',
    minerals: 'Magnesium Carbonates & Clays',
    povImage: '/nasa/pov_beta.jpeg',
    povInstrument: 'MASTCAM-Z STEREO • SOL 612',
    povTitle: 'Fractured Delta Margin & Talus Apron',
    povDesc: 'Steep talus apron bordering ancient river channel. Requires slow footing and buddy-tether verification.',
    scienceValue: '86% Priority — Spectrometer Scan'
  }
];

const NOMINAL_PATH = 'M 16 78 L 28 70 L 42 62 L 56 54 L 68 44 L 76 34 L 82 24';
const EMERGENCY_PATH = 'M 68 44 L 54 52 L 42 62 L 16 78';

// --- A* GRID PATHFINDER (50x50 Martian Terrain Cost Grid) ---
const GRID_SIZE = 50;

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const SLOPE_HAZARD_1 = [[22, 22], [42, 20], [44, 38], [24, 39]];
const SLOPE_HAZARD_2 = [[74, 48], [92, 46], [95, 68], [76, 66]];

function getCellTraversalCost(gx, gy, avoidDustTrap) {
  const x = (gx + 0.5) * (100 / GRID_SIZE);
  const y = (gy + 0.5) * (100 / GRID_SIZE);

  if (pointInPolygon(x, y, SLOPE_HAZARD_1) || pointInPolygon(x, y, SLOPE_HAZARD_2)) {
    return Infinity;
  }

  let cost = 1.0;
  const distDust = Math.hypot(x - 50, y - 82);
  if (distDust < 11) {
    cost += avoidDustTrap ? 4.5 : 1.8;
  }

  const distSilica = Math.hypot(x - 68, y - 44);
  if (distSilica < 9) {
    cost = 0.85;
  }

  return cost;
}

function runAStarRoute(startPct, endPct, avoidDustTrap = true) {
  const toGrid = (v) => Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((v / 100) * GRID_SIZE)));
  const toPct = (g) => (g + 0.5) * (100 / GRID_SIZE);

  const start = { x: toGrid(startPct.x), y: toGrid(startPct.y) };
  const goal = { x: toGrid(endPct.x), y: toGrid(endPct.y) };

  if (getCellTraversalCost(goal.x, goal.y, avoidDustTrap) === Infinity) {
    return { blocked: true, points: [], distanceMeters: 0, o2CostPct: 0 };
  }

  const key = (x, y) => `${x},${y}`;
  const openSet = [start];
  const cameFrom = new Map();
  const gScore = new Map([[key(start.x, start.y), 0]]);
  const fScore = new Map([
    [key(start.x, start.y), Math.hypot(goal.x - start.x, goal.y - start.y)]
  ]);

  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]
  ];

  while (openSet.length > 0) {
    openSet.sort((a, b) => (fScore.get(key(a.x, a.y)) ?? Infinity) - (fScore.get(key(b.x, b.y)) ?? Infinity));
    const current = openSet.shift();

    if (current.x === goal.x && current.y === goal.y) {
      const path = [{ x: endPct.x, y: endPct.y }];
      let currKey = key(current.x, current.y);
      while (cameFrom.has(currKey)) {
        const prev = cameFrom.get(currKey);
        path.unshift({ x: toPct(prev.x), y: toPct(prev.y) });
        currKey = key(prev.x, prev.y);
      }
      path[0] = { x: startPct.x, y: startPct.y };

      let totalUnits = 0;
      for (let i = 1; i < path.length; i++) {
        totalUnits += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      }
      const distanceMeters = Math.round(totalUnits * 10);
      const o2CostPct = Math.max(1, Math.round((distanceMeters / 100) * 1.4));

      return { blocked: false, points: path, distanceMeters, o2CostPct };
    }

    const currG = gScore.get(key(current.x, current.y)) ?? Infinity;

    for (const [dx, dy, stepMult] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

      const cellCost = getCellTraversalCost(nx, ny, avoidDustTrap);
      if (cellCost === Infinity) continue;

      const tentativeG = currG + stepMult * cellCost;
      const nKey = key(nx, ny);

      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, current);
        gScore.set(nKey, tentativeG);
        fScore.set(nKey, tentativeG + Math.hypot(goal.x - nx, goal.y - ny));
        if (!openSet.some((n) => n.x === nx && n.y === ny)) {
          openSet.push({ x: nx, y: ny });
        }
      }
    }
  }

  return { blocked: true, points: [], distanceMeters: 0, o2CostPct: 0 };
}

export default function App() {
  const [viewMode, setViewMode] = useState('tactical'); // 'tactical' | 'visor'
  const [layers, setLayers] = useState({
    optical: true,
    slope: true,
    mineral: true,
    radiation: false
  });

  const [overlayOpacity, setOverlayOpacity] = useState(0.75);
  const [selectedWp, setSelectedWp] = useState(WAYPOINTS[2]);
  const [emergencyMode, setEmergencyMode] = useState('nominal');
  const [astronautPos, setAstronautPos] = useState({ x: 64, y: 47 });
  const [expandedPov, setExpandedPov] = useState(false);

  const [customTarget, setCustomTarget] = useState(null);
  const [routeWarning, setRouteWarning] = useState('');

  const customRoute = useMemo(() => {
    if (!customTarget) return null;
    return runAStarRoute(astronautPos, customTarget, layers.radiation);
  }, [astronautPos, customTarget, layers.radiation]);

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const y = Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));

    const testRoute = runAStarRoute(astronautPos, { x, y }, layers.radiation);
    if (testRoute.blocked) {
      setRouteWarning('NO-GO ZONE: Slope >15° exceeds EVA spacesuit stability limit.');
      setTimeout(() => setRouteWarning(''), 3200);
      return;
    }

    setRouteWarning('');
    setCustomTarget({ x, y });
  };

  const toggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const triggerScenario = (mode) => {
    setEmergencyMode(mode);
    setCustomTarget(null);
    if (mode === 'solar_flare') {
      setLayers((prev) => ({ ...prev, radiation: true }));
      setSelectedWp(WAYPOINTS[1]);
    } else if (mode === 'o2_leak') {
      setSelectedWp(WAYPOINTS[1]);
    } else {
      setSelectedWp(WAYPOINTS[2]);
    }
  };

  const telemetry = {
    nominal: {
      o2: '84%',
      o2Time: '04h 12m',
      battery: '91%',
      radDose: '0.42 / 2.00 mSv',
      radRate: '0.24 mSv/hr',
      metabolic: '315 kcal/hr',
      statusText: 'NOMINAL EVA — SCIENCE CORRIDOR ACTIVE',
      statusColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
    },
    solar_flare: {
      o2: '79%',
      o2Time: '03h 48m',
      battery: '88%',
      radDose: '1.18 / 2.00 mSv',
      radRate: '1.85 mSv/hr (SEP SPIKE)',
      metabolic: '440 kcal/hr',
      statusText: 'ALERT: SOLAR ENERGETIC PARTICLE EVENT — REROUTING TO ROVER SHELTER',
      statusColor: 'text-red-400 border-red-500/60 bg-red-950/60 animate-pulse'
    },
    o2_leak: {
      o2: '41%',
      o2Time: '01h 08m',
      battery: '89%',
      radDose: '0.45 / 2.00 mSv',
      radRate: '0.24 mSv/hr',
      metabolic: '490 kcal/hr',
      statusText: 'CRITICAL: PLSS PRIMARY O₂ PRESSURE DROP — ABORTING SCI-B',
      statusColor: 'text-amber-400 border-amber-500/60 bg-amber-950/60 animate-pulse'
    }
  }[emergencyMode];

  const customSvgPath =
    customRoute && !customRoute.blocked && customRoute.points.length > 1
      ? customRoute.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-orange-500/30">
      {/* Top Mission Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-5 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold tracking-wider text-sm uppercase text-white">
                A.R.E.S. Tactical EVA Navigator
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-orange-300 border border-slate-700">
                SOL 142 • JEZERO CRATER (18.44°N, 77.45°E)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-Mission Surface Data Fusion & Astronaut Safety Routing
            </p>
          </div>
        </div>

        {/* Mode Switcher + Status Banner */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('tactical')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'tactical'
                  ? 'bg-orange-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Tactical Map
            </button>
            <button
              onClick={() => setViewMode('visor')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'visor'
                  ? 'bg-cyan-400 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              Helmet Visor HUD
            </button>
          </div>

          <div className={`px-3.5 py-1.5 rounded-md border text-xs font-mono font-semibold flex items-center gap-2 ${telemetry.statusColor}`}>
            {emergencyMode === 'nominal' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{telemetry.statusText}</span>
          </div>
        </div>
      </header>

      {/* Main 3-Column Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* LEFT PANEL: NASA Data Layers & Anomaly Simulator */}
        <aside className="lg:col-span-3 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between gap-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-400" />
                NASA Data Layers
              </span>
            </div>

            <div className="space-y-2">
              <LayerToggle
                active={layers.optical}
                onClick={() => toggleLayer('optical')}
                title="Optical Surface Imagery"
                instrument="MRO HiRISE (0.25m/px)"
                badgeColor="bg-amber-600"
                desc="High-res orbital terrain & boulder field map"
              />
              <LayerToggle
                active={layers.slope}
                onClick={() => toggleLayer('slope')}
                title="Topographic Slope Hazards"
                instrument="HiRISE DTM Elevation"
                badgeColor="bg-rose-500"
                desc="Flags >15° suit tip-over zones & steep scarps"
              />
              <LayerToggle
                active={layers.mineral}
                onClick={() => toggleLayer('mineral')}
                title="Mineral & Biosignatures"
                instrument="MRO CRISM Spectrometer"
                badgeColor="bg-cyan-400"
                desc="Hydrated silica, sulfates & carbonate outcrops"
              />
              <LayerToggle
                active={layers.radiation}
                onClick={() => toggleLayer('radiation')}
                title="Radiation & Thermal Inertia"
                instrument="MSL RAD + Odyssey THEMIS"
                badgeColor="bg-purple-500"
                desc="Surface dose rates & deep dust trap zones"
              />
            </div>

            {/* Overlay Opacity Slider */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-orange-400" />
                  DATA OVERLAY OPACITY
                </span>
                <span className="text-slate-200">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.15"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Map Legend */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
              <div className="font-mono text-[11px] text-slate-400 uppercase">EVA Mobility Legend</div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-emerald-400 inline-block"></span> Planned Traverse
                </span>
                <span className="font-mono text-[11px] text-slate-500">1.42 km</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-amber-400 inline-block"></span> Custom A* Route
                </span>
                <span className="font-mono text-[11px] text-amber-300">Click Map</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/40 border border-rose-500 inline-block"></span> Slope &gt;15° No-Go
                </span>
                <span className="font-mono text-[11px] text-rose-400">Blocked</span>
              </div>
            </div>
          </div>

          {/* Contingency Simulator Controls */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Contingency Simulator</span>
            </div>
            <button
              onClick={() => triggerScenario('solar_flare')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition flex items-center justify-between ${
                emergencyMode === 'solar_flare'
                  ? 'bg-red-950/80 border-red-500 text-red-200'
                  : 'bg-slate-800/70 border-slate-700 hover:border-red-500/50 text-slate-200'
              }`}
            >
              <span>Simulate Solar Flare (SEP)</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                RAD SPIKE
              </span>
            </button>

            <button
              onClick={() => triggerScenario('o2_leak')}
              className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition flex items-center justify-between ${
                emergencyMode === 'o2_leak'
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                  : 'bg-slate-800/70 border-slate-700 hover:border-amber-500/50 text-slate-200'
              }`}
            >
              <span>Simulate Suit O₂ Drop</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                41% O₂
              </span>
            </button>

            {emergencyMode !== 'nominal' && (
              <button
                onClick={() => triggerScenario('nominal')}
                className="w-full px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-600/30 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restore Nominal EVA Plan
              </button>
            )}
          </div>
        </aside>

        {/* CENTER PANEL: Switches between Tactical Orbital Map & First-Person Helmet Visor AR HUD */}
        {viewMode === 'tactical' ? (
          <main className="lg:col-span-6 relative bg-stone-950 flex flex-col min-h-[520px] overflow-hidden">
            <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-center pointer-events-none">
              <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-md text-[11px] font-mono text-slate-300 flex items-center gap-3">
                <span>GRID: JEZERO-W-09</span>
                <span className="text-slate-600">|</span>
                <span>MRO HIRISE ESP_046060_1985</span>
              </div>
              <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-md text-[11px] font-mono text-cyan-300">
                ACTIVE LAYERS: {Object.values(layers).filter(Boolean).length} / 4
              </div>
            </div>

            {routeWarning && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-red-950/95 border border-red-500 text-red-200 px-3.5 py-1.5 rounded-md text-xs font-mono shadow-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{routeWarning}</span>
              </div>
            )}

            <div
              onClick={handleMapClick}
              title="Click anywhere on terrain to compute A* safe EVA path"
              className="relative flex-1 w-full h-full select-none bg-slate-950 cursor-crosshair"
            >
              {layers.optical && (
                <img
                  src="/nasa/jezero_hirise.png"
                  alt="Jezero Crater HiRISE Orbital Map"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="absolute inset-0 w-full h-full object-cover brightness-90 contrast-110"
                />
              )}

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full absolute inset-0"
              >
                <defs>
                  <radialGradient id="marsFallback" cx="55%" cy="40%" r="75%">
                    <stop offset="0%" stopColor={layers.optical ? 'rgba(124, 63, 38, 0.35)' : '#1e293b'} />
                    <stop offset="55%" stopColor={layers.optical ? 'rgba(89, 41, 24, 0.45)' : '#0f172a'} />
                    <stop offset="100%" stopColor={layers.optical ? 'rgba(54, 23, 14, 0.65)' : '#020617'} />
                  </radialGradient>

                  <pattern id="tacGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path
                      d="M 10 0 L 0 0 0 10"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="0.2"
                    />
                  </pattern>
                </defs>

                <rect width="100" height="100" fill="url(#marsFallback)" />
                <rect width="100" height="100" fill="url(#tacGrid)" />

                <g style={{ opacity: overlayOpacity }}>
                  {layers.slope && (
                    <g>
                      <polygon
                        points="22,22 42,20 44,38 24,39"
                        fill="rgba(244, 63, 94, 0.34)"
                        stroke="#f43f5e"
                        strokeWidth="0.45"
                        strokeDasharray="1.2 0.8"
                      />
                      <text x="25" y="30" fill="#ffe4e6" fontSize="2.2" fontWeight="bold" fontFamily="monospace">
                        SLOPE 22° (NO-GO)
                      </text>

                      <polygon
                        points="74,48 92,46 95,68 76,66"
                        fill="rgba(244, 63, 94, 0.34)"
                        stroke="#f43f5e"
                        strokeWidth="0.45"
                        strokeDasharray="1.2 0.8"
                      />
                      <text x="77" y="58" fill="#ffe4e6" fontSize="2.2" fontWeight="bold" fontFamily="monospace">
                        SCARP 19°
                      </text>
                    </g>
                  )}

                  {layers.mineral && (
                    <g>
                      <ellipse
                        cx="68"
                        cy="44"
                        rx="11"
                        ry="7"
                        fill="rgba(34, 211, 238, 0.28)"
                        stroke="#22d3ee"
                        strokeWidth="0.5"
                      />
                      <text x="59" y="35.5" fill="#cffafe" fontSize="2.1" fontWeight="bold" fontFamily="monospace">
                        CRISM: HYDRATED SILICA
                      </text>

                      <ellipse
                        cx="82"
                        cy="24"
                        rx="9"
                        ry="6"
                        fill="rgba(45, 212, 191, 0.28)"
                        stroke="#2dd4bf"
                        strokeWidth="0.5"
                      />
                      <text x="73" y="16.5" fill="#ccfbf1" fontSize="2.1" fontWeight="bold" fontFamily="monospace">
                        MG-CARBONATES
                      </text>
                    </g>
                  )}

                  {layers.radiation && (
                    <g>
                      <rect
                        x="0"
                        y="0"
                        width="100"
                        height="100"
                        fill={
                          emergencyMode === 'solar_flare'
                            ? 'rgba(239, 68, 68, 0.32)'
                            : 'rgba(168, 85, 247, 0.2)'
                        }
                      />
                      <circle
                        cx="50"
                        cy="82"
                        r="11"
                        fill="rgba(168, 85, 247, 0.3)"
                        stroke="#c084fc"
                        strokeWidth="0.45"
                        strokeDasharray="1 1"
                      />
                      <text x="41" y="83" fill="#f3e8ff" fontSize="2.1" fontWeight="bold" fontFamily="monospace">
                        LOW THERMAL INERTIA (DUST TRAP)
                      </text>
                    </g>
                  )}
                </g>

                <circle
                  cx="42"
                  cy="62"
                  r="22"
                  fill="rgba(56, 189, 248, 0.08)"
                  stroke="rgba(56, 189, 248, 0.45)"
                  strokeWidth="0.35"
                  strokeDasharray="1.5 1.5"
                />

                <path
                  d={NOMINAL_PATH}
                  fill="none"
                  stroke={emergencyMode === 'nominal' ? '#34d399' : 'rgba(226, 232, 240, 0.45)'}
                  strokeWidth={emergencyMode === 'nominal' ? '0.9' : '0.45'}
                  strokeDasharray={emergencyMode === 'nominal' ? 'none' : '1.2 1.2'}
                />

                {customSvgPath && emergencyMode === 'nominal' && (
                  <path
                    d={customSvgPath}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.05"
                    strokeDasharray="1.6 0.8"
                  />
                )}

                {emergencyMode !== 'nominal' && (
                  <path
                    d={EMERGENCY_PATH}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.15"
                    strokeDasharray="1.5 0.8"
                  />
                )}
              </svg>

              {WAYPOINTS.map((wp) => {
                const isSelected = selectedWp.id === wp.id;
                return (
                  <button
                    key={wp.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWp(wp);
                    }}
                    style={{ left: `${wp.x}%`, top: `${wp.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 group transition-transform ${
                      isSelected ? 'scale-110' : 'hover:scale-105'
                    }`}
                  >
                    <div
                      className={`px-2 py-1 rounded-md border text-[10px] font-mono font-bold shadow-lg flex items-center gap-1 whitespace-nowrap ${
                        isSelected
                          ? 'bg-orange-500 text-slate-950 border-white'
                          : 'bg-slate-950/90 text-slate-100 border-slate-500 hover:border-orange-400'
                      }`}
                    >
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{wp.code}</span>
                    </div>
                  </button>
                );
              })}

              {customTarget && emergencyMode === 'nominal' && (
                <div
                  style={{ left: `${customTarget.x}%`, top: `${customTarget.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center"
                >
                  <div className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 border border-white text-[10px] font-mono font-bold shadow-lg flex items-center gap-1">
                    <Crosshair className="w-3 h-3" />
                    <span>A* TGT</span>
                  </div>
                </div>
              )}

              <div
                style={{ left: `${astronautPos.x}%`, top: `${astronautPos.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center"
              >
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-400 border-2 border-slate-950"></span>
                </span>
                <span className="mt-1 px-1.5 py-0.5 rounded bg-sky-950/90 border border-sky-400 text-[9px] font-mono font-bold text-sky-200">
                  EVA-1 (CDR)
                </span>
              </div>
            </div>

            <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              {customRoute && !customRoute.blocked && emergencyMode === 'nominal' ? (
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-amber-300 font-bold">
                    A* ROUTE: {customRoute.distanceMeters} m
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-300">
                    EST. O₂ COST: -{customRoute.o2CostPct}%
                  </span>
                  <button
                    onClick={() => setCustomTarget(null)}
                    className="text-slate-400 hover:text-white underline ml-1"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <span className="text-slate-400 font-mono text-[11px]">
                  CLICK ANYWHERE ON MAP TO COMPUTE HAZARD-AVOIDING A* ROUTE
                </span>
              )}

              <button
                onClick={() =>
                  setAstronautPos((prev) =>
                    prev.x === 64 ? { x: 42, y: 62 } : { x: 64, y: 47 }
                  )
                }
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-[11px] flex items-center gap-1.5"
              >
                <Navigation className="w-3 h-3 text-sky-400" />
                {astronautPos.x === 64 ? 'Move EVA-1 to Rover' : 'Move EVA-1 to SCI-A'}
              </button>
            </div>
          </main>
        ) : (
          /* FIRST-PERSON ASTRONAUT HELMET VISOR AR HUD VIEW */
          <main className="lg:col-span-6 relative bg-black flex flex-col min-h-[520px] overflow-hidden select-none">
            {/* First-Person Ground Imagery */}
            <img
              src={selectedWp.povImage}
              alt={selectedWp.povTitle}
              className="absolute inset-0 w-full h-full object-cover brightness-95 contrast-105 scale-105"
            />

            {/* Curved Helmet Visor Optical Vignette & Tint */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  emergencyMode !== 'nominal'
                    ? 'radial-gradient(circle at center, transparent 48%, rgba(127, 29, 29, 0.72) 100%)'
                    : 'radial-gradient(circle at center, transparent 52%, rgba(2, 6, 23, 0.85) 100%)'
              }}
            />

            {/* Top Visor Compass Tape */}
            <div className="relative z-20 pt-4 px-6 flex flex-col items-center">
              <div className="w-full max-w-md bg-slate-950/75 backdrop-blur-md border border-cyan-500/40 rounded-full px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-cyan-300 shadow-lg">
                <span>{(selectedWp.headingDeg - 30 + 360) % 360}°</span>
                <span className="text-slate-500">|</span>
                <span>{(selectedWp.headingDeg - 15 + 360) % 360}°</span>
                <span className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-bold">
                  HDG {String(selectedWp.headingDeg).padStart(3, '0')}°
                </span>
                <span>{(selectedWp.headingDeg + 15) % 360}°</span>
                <span className="text-slate-500">|</span>
                <span>{(selectedWp.headingDeg + 30) % 360}°</span>
              </div>
              <div className="mt-1.5 text-[10px] font-mono text-cyan-200/80 tracking-widest">
                VISOR AR OVERLAY • {selectedWp.povInstrument}
              </div>
            </div>

            {/* Center Visor AR Reticle & Spectral/Slope Callout */}
            <div className="relative z-20 flex-1 flex items-center justify-center px-6">
              {/* Artificial Horizon / Suit Tilt Lines */}
              <div
                style={{ transform: `rotate(${selectedWp.pitchDeg * 0.45}deg)` }}
                className="w-full max-w-lg border-t border-dashed border-cyan-400/40 flex justify-between items-center text-[10px] font-mono text-cyan-300/80 pt-1 transition-transform duration-500"
              >
                <span>PITCH +{selectedWp.pitchDeg}°</span>
                <span>SUIT COG NOMINAL</span>
              </div>

              {/* Floating Waypoint AR Lock Box */}
              <div className="absolute bg-slate-950/80 backdrop-blur-md border-2 border-cyan-400/80 rounded-xl p-3.5 max-w-xs shadow-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-cyan-500/30 pb-1.5 mb-2">
                  <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    {selectedWp.code} • {selectedWp.distanceStr}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200">
                    AR LOCK
                  </span>
                </div>
                <div className="text-xs font-bold text-white">{selectedWp.name}</div>
                {layers.mineral && (
                  <div className="mt-1 text-[11px] font-mono text-emerald-300">
                    CRISM: {selectedWp.minerals}
                  </div>
                )}
                {layers.slope && (
                  <div className="mt-0.5 text-[11px] font-mono text-amber-300">
                    TERRAIN SLOPE: {selectedWp.slope}
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Visor Warning Banner */}
            {emergencyMode !== 'nominal' && (
              <div className="relative z-20 mx-auto mb-3 px-4 py-2 rounded-lg bg-red-950/90 border-2 border-red-500 text-red-200 font-mono text-xs font-bold flex items-center gap-2 animate-pulse shadow-2xl">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  TURN TO HDG 236° — FOLLOW GREEN CHEVRONS TO ROVER SHELTER (265 m)
                </span>
              </div>
            )}

            {/* Bottom Visor Quick-Waypoint Selector Strip */}
            <div className="relative z-20 bg-slate-950/85 backdrop-blur-md border-t border-cyan-500/30 px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-cyan-300 uppercase">
                Visor Waypoint Lock:
              </span>
              <div className="flex items-center gap-1.5">
                {WAYPOINTS.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => setSelectedWp(wp)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border transition ${
                      selectedWp.id === wp.id
                        ? 'bg-cyan-400 text-slate-950 border-white'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    {wp.code}
                  </button>
                ))}
              </div>
            </div>
          </main>
        )}

        {/* RIGHT PANEL: Suit Telemetry & Surface POV Waypoint Card */}
        <aside className="lg:col-span-3 border-l border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                PLSS Suit Telemetry
              </span>
              <span className="text-emerald-400">UHF LINK OK</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <TelemetryBox
                icon={<Wind className="w-3.5 h-3.5 text-sky-400" />}
                label="Primary O₂"
                value={telemetry.o2}
                sub={telemetry.o2Time}
                alert={emergencyMode === 'o2_leak'}
              />
              <TelemetryBox
                icon={<Battery className="w-3.5 h-3.5 text-emerald-400" />}
                label="Suit Power"
                value={telemetry.battery}
                sub="Nominal Load"
              />
              <TelemetryBox
                icon={<Radio className="w-3.5 h-3.5 text-purple-400" />}
                label="RAD Dose"
                value={telemetry.radRate}
                sub={telemetry.radDose}
                alert={emergencyMode === 'solar_flare'}
              />
              <TelemetryBox
                icon={<Activity className="w-3.5 h-3.5 text-orange-400" />}
                label="Metabolic"
                value={telemetry.metabolic}
                sub="1.2 m/s Pace"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div>
              <div
                onClick={() => setExpandedPov(true)}
                className="relative h-40 bg-gradient-to-b from-amber-900/40 via-orange-950/70 to-stone-950 border-b border-slate-800 p-3 flex flex-col justify-between overflow-hidden cursor-pointer group"
              >
                <img
                  src={selectedWp.povImage}
                  alt={selectedWp.povTitle}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-black/40" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-black/75 border border-white/15 text-[10px] font-mono text-orange-300 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {selectedWp.povInstrument}
                  </span>
                  <span className="p-1 rounded bg-black/75 border border-white/15 text-slate-200 group-hover:text-orange-300">
                    <Maximize2 className="w-3 h-3" />
                  </span>
                </div>

                <div className="relative z-10 text-[11px] font-mono text-amber-100 drop-shadow truncate">
                  {selectedWp.povTitle}
                </div>
              </div>

              <div className="p-3.5 space-y-2">
                <div>
                  <div className="text-[11px] font-mono text-orange-400 uppercase">
                    {selectedWp.type}
                  </div>
                  <h2 className="text-sm font-bold text-white">{selectedWp.name}</h2>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {selectedWp.povDesc}
                </p>

                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                  <MetaRow label="Elevation" value={selectedWp.elevation} />
                  <MetaRow label="Terrain Slope" value={selectedWp.slope} />
                  <MetaRow label="CRISM Signature" value={selectedWp.minerals} />
                  <MetaRow label="Radiation" value={selectedWp.radiation} />
                </div>
              </div>
            </div>

            <div className="px-3.5 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Objective:
              </span>
              <span className="font-mono text-[11px] text-cyan-300 font-semibold">
                {selectedWp.scienceValue}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Full-Screen Rover POV Lightbox Modal */}
      {expandedPov && (
        <div
          onClick={() => setExpandedPov(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-orange-400">
                  {selectedWp.povInstrument} • {selectedWp.code}
                </span>
                <h3 className="text-sm font-bold text-white">{selectedWp.povTitle}</h3>
              </div>
              <button
                onClick={() => setExpandedPov(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center min-h-[320px] max-h-[70vh]">
              <img
                src={selectedWp.povImage}
                alt={selectedWp.povTitle}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="px-4 py-3 bg-slate-950 text-xs text-slate-300">
              {selectedWp.povDesc}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LayerToggle({ active, onClick, title, instrument, badgeColor, desc }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-lg border transition ${
        active
          ? 'bg-slate-800/90 border-slate-600 shadow-sm'
          : 'bg-slate-950/50 border-slate-800/80 opacity-65 hover:opacity-90'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-100 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${badgeColor}`} />
          {title}
        </span>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
          }`}
        >
          {active ? 'ON' : 'OFF'}
        </span>
      </div>
      <div className="mt-1 text-[10px] font-mono text-orange-300/90">{instrument}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{desc}</div>
    </button>
  );
}

function TelemetryBox({ icon, label, value, sub, alert = false }) {
  return (
    <div
      className={`p-2.5 rounded-lg border ${
        alert
          ? 'bg-red-950/50 border-red-500/70'
          : 'bg-slate-950/90 border-slate-800'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-base font-mono font-bold ${alert ? 'text-red-300' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-[10px] font-mono text-slate-500 truncate">{sub}</div>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-200 font-mono text-right">{value}</span>
    </div>
  );
}
