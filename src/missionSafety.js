import { runAStarRoute } from './navigation.js';

// Illustrative suit-tank percentage points, NOT validated life-support predictions.
// Travel consumption preserves the original app's 1.4% per 100 simulated meters.
export const SIMULATION_MODEL = {
  walkingSpeedMps: 1.2,
  oxygenPctPer100Meters: 1.4,
  explorationOxygenPctPerMinute: 0.2,
};

export const travelMinutes = (distanceMeters) => distanceMeters / SIMULATION_MODEL.walkingSpeedMps / 60;
export const travelOxygenPct = (distanceMeters) => distanceMeters / 100 * SIMULATION_MODEL.oxygenPctPer100Meters;

const validPercentage = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
const validRoute = (route) => route && !route.blocked && Number.isFinite(route.distanceMeters) && route.distanceMeters >= 0;

export function calculateOxygenBudget({ outboundRoute, returnRoute, availableOxygenPct, explorationMinutes, reservePct }) {
  const warnings = [];
  if (!validPercentage(availableOxygenPct) || !validPercentage(reservePct) ||
    !Number.isFinite(explorationMinutes) || explorationMinutes < 0) {
    warnings.push('Enter oxygen and reserve from 0–100%, and a nonnegative exploration time.');
  }
  if (!validRoute(outboundRoute)) warnings.push(`Outbound route unavailable. ${outboundRoute?.reason ?? ''}`.trim());
  if (!validRoute(returnRoute)) warnings.push(`Return route unavailable. ${returnRoute?.reason ?? ''}`.trim());
  if (warnings.length) return { status: 'NO-GO', totalOxygenPct: null, warnings };

  const outboundOxygenPct = travelOxygenPct(outboundRoute.distanceMeters);
  const returnOxygenPct = travelOxygenPct(returnRoute.distanceMeters);
  const explorationOxygenPct = explorationMinutes * SIMULATION_MODEL.explorationOxygenPctPerMinute;
  const consumptionOxygenPct = outboundOxygenPct + returnOxygenPct + explorationOxygenPct;
  const totalOxygenPct = consumptionOxygenPct + reservePct;
  const status = availableOxygenPct >= totalOxygenPct ? 'GO' :
    availableOxygenPct >= consumptionOxygenPct ? 'CAUTION' : 'NO-GO';
  if (status === 'CAUTION') warnings.push('Travel and exploration fit, but the full emergency reserve would not remain.');
  if (status === 'NO-GO') warnings.push('Insufficient oxygen for travel, exploration, and return, even before reserve.');
  return {
    status, outboundOxygenPct, returnOxygenPct, explorationOxygenPct, consumptionOxygenPct,
    totalOxygenPct, remainingOxygenPct: availableOxygenPct - consumptionOxygenPct,
    outboundMinutes: travelMinutes(outboundRoute.distanceMeters),
    returnMinutes: travelMinutes(returnRoute.distanceMeters), warnings,
  };
}

export function planMission({ start, target, returnDestination, terrain, ...inputs }) {
  const outboundRoute = runAStarRoute(start, target, terrain);
  const returnRoute = runAStarRoute(target, returnDestination, terrain);
  return { outboundRoute, returnRoute, ...calculateOxygenBudget({ outboundRoute, returnRoute, ...inputs }) };
}

export function planEmergency({ start, emergencyType, waypoints, availableOxygenPct, reservePct, terrain }) {
  const capability = { solar_flare: 'radiationShelter', o2_leak: 'oxygenSupport' }[emergencyType];
  const candidates = capability ? waypoints.filter((wp) => wp[capability] === true) : [];
  const routes = candidates.map((destination) => ({ destination, route: runAStarRoute(start, destination, terrain) }));
  const reachable = routes.filter(({ route }) => !route.blocked)
    .sort((a, b) => a.route.distanceMeters - b.route.distanceMeters);
  if (!reachable.length) return {
    destination: null, route: null, feasible: false, status: 'NO-GO',
    warnings: [candidates.length ? 'No safe route available to a suitable destination.' : 'No suitable safe destination is defined.',
      ...new Set(routes.map(({ route }) => route.reason))],
  };

  const { destination, route } = reachable[0];
  const oxygenRequiredPct = travelOxygenPct(route.distanceMeters);
  const inputsValid = validPercentage(availableOxygenPct) && validPercentage(reservePct);
  const feasible = inputsValid && oxygenRequiredPct <= availableOxygenPct;
  const status = !feasible ? 'NO-GO' : oxygenRequiredPct + reservePct > availableOxygenPct ? 'CAUTION' : 'GO';
  const warnings = [];
  if (!inputsValid) warnings.push('Enter oxygen and reserve from 0–100%.');
  else if (!feasible) warnings.push('No oxygen-feasible escape route available. Shown route avoids terrain hazards, but exceeds remaining oxygen.');
  else if (status === 'CAUTION') warnings.push('Escape uses the configured emergency oxygen reserve.');
  if (emergencyType === 'solar_flare') warnings.push('RVR-04 is an oxygen cache, not a radiation shelter. Surface transit remains exposed to the simulated solar event.');
  if (emergencyType === 'o2_leak') warnings.push('Spare oxygen access is assumed; an ongoing leak is not modeled.');
  return { destination, route, feasible, status, oxygenRequiredPct,
    travelMinutes: travelMinutes(route.distanceMeters), warnings };
}
