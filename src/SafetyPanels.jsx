import { AlertTriangle, ShieldAlert, Wind } from 'lucide-react';
import { SIMULATION_MODEL } from './missionSafety.js';

const statusColors = {
  GO: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/40',
  CAUTION: 'text-amber-300 border-amber-500/50 bg-amber-950/40',
  'NO-GO': 'text-red-300 border-red-500/50 bg-red-950/40',
};
const pct = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Unavailable';
const meters = (route) => route && !route.blocked ? `${Math.round(route.distanceMeters)} m` : 'Unavailable';

function SafetyRow({ label, children }) {
  return <div className="flex justify-between gap-3 text-[11px]">
    <span className="text-slate-400">{label}</span>
    <span className="text-slate-100 font-mono text-right">{children}</span>
  </div>;
}

function NumericInput({ label, value, onChange, max, disabled = false }) {
  return <label className="text-[11px] text-slate-400 flex flex-col gap-1">
    {label}
    <input type="number" min="0" max={max} step="1" value={Number.isNaN(value) ? '' : value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 font-mono focus:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-50" />
  </label>;
}

export function OxygenPanel({ plan, targetLabel, availableOxygenPct, setAvailableOxygenPct,
  explorationMinutes, setExplorationMinutes, reservePct, setReservePct, emergencyActive, oxygenReadOnly = false }) {
  return <section aria-label="EVA oxygen safety calculator" className="rounded-lg border border-slate-800 bg-slate-950/90 p-3 space-y-2">
    <h2 className="text-xs font-mono text-sky-300 flex items-center gap-1.5"><Wind className="w-4 h-4" /> EVA O₂ / RETURN SAFETY</h2>
    <p className="text-[11px] text-slate-400">EVA-1 → {targetLabel} → HAB-01</p>
    <div className="grid grid-cols-2 gap-2">
      <NumericInput label="Available O₂ (%)" value={availableOxygenPct} onChange={setAvailableOxygenPct} max="100" disabled={oxygenReadOnly} />
      <NumericInput label="Emergency reserve (%)" value={reservePct} onChange={setReservePct} max="100" />
      <NumericInput label="Exploration time (min)" value={explorationMinutes} onChange={setExplorationMinutes} />
      <div className={`self-end text-center rounded border px-1 py-1 font-mono text-sm font-bold ${statusColors[plan.status]}`}>
        <span className="block text-[9px] font-normal">MISSION</span>{plan.status}
      </div>
    </div>
    <div aria-live="polite" className="space-y-1 border-t border-slate-800 pt-2">
      <SafetyRow label={`Outbound (${meters(plan.outboundRoute)})`}>{pct(plan.outboundOxygenPct)}</SafetyRow>
      <SafetyRow label={`Return to HAB-01 (${meters(plan.returnRoute)})`}>{pct(plan.returnOxygenPct)}</SafetyRow>
      <SafetyRow label="Exploration O₂">{pct(plan.explorationOxygenPct)}</SafetyRow>
      <SafetyRow label="Emergency reserve">{pct(reservePct)}</SafetyRow>
      <SafetyRow label="Total O₂ required">{pct(plan.totalOxygenPct)}</SafetyRow>
      <SafetyRow label="O₂ left after mission">{pct(plan.remainingOxygenPct)}</SafetyRow>
      {Number.isFinite(plan.outboundMinutes) && <SafetyRow label="Travel + exploration time">
        {(plan.outboundMinutes + plan.returnMinutes + explorationMinutes).toFixed(1)} min
      </SafetyRow>}
      {plan.warnings.map((warning) => <p key={warning} className="text-[11px] text-amber-300">{warning}</p>)}
    </div>
    <p className="text-[10px] text-slate-500">
      GO: reserve preserved. CAUTION: reserve shortfall. NO-GO: insufficient O₂ or unavailable route.
      {emergencyActive && ' Mission preview only; use the emergency panel for immediate escape.'}
    </p>
    <p className="text-[10px] text-slate-400">SIMULATION ONLY — not validated astronaut life-support predictions.
      {' '}{SIMULATION_MODEL.oxygenPctPer100Meters}% tank / 100 m walking at {SIMULATION_MODEL.walkingSpeedMps} m/s;
      {' '}{SIMULATION_MODEL.explorationOxygenPctPerMinute}% tank / min exploration. Reserve is percentage points of a full tank.</p>
  </section>;
}

export function EmergencyPanel({ plan, emergencyMode, availableOxygenPct }) {
  if (!plan) return null;
  return <section aria-label="Emergency escape information" aria-live="polite"
    className="rounded-lg border border-red-500/60 bg-red-950/30 p-3 space-y-2">
    <h2 className="text-xs text-red-300 font-mono flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> EMERGENCY ESCAPE • SIMULATION</h2>
    <SafetyRow label="Emergency type">{emergencyMode === 'solar_flare' ? 'Solar flare (SEP)' : 'Suit O₂ drop'}</SafetyRow>
    <SafetyRow label="Recommended destination">{plan.destination?.code ?? 'None reachable'}</SafetyRow>
    {plan.destination && <p className="text-[11px] text-slate-300">{plan.destination.name} — {emergencyMode === 'solar_flare' ? 'Radiation shelter' : 'Oxygen support'}</p>}
    <SafetyRow label="Escape distance">{meters(plan.route)}</SafetyRow>
    <SafetyRow label="Estimated travel time">{Number.isFinite(plan.travelMinutes) ? `${plan.travelMinutes.toFixed(1)} min` : 'Unavailable'}</SafetyRow>
    <SafetyRow label="Remaining O₂">{pct(availableOxygenPct)}</SafetyRow>
    <SafetyRow label="Escape O₂ required">{pct(plan.oxygenRequiredPct)}</SafetyRow>
    <div className={`rounded border px-2 py-1 text-[11px] font-mono ${statusColors[plan.status]}`}>
      {plan.status} • {plan.route ? (plan.feasible ? 'Terrain route reachable with current O₂' : 'Route cannot be approved with current O₂ inputs') : 'No safe route available'}
    </div>
    {plan.route?.distanceMeters === 0 && <p className="text-[11px] text-emerald-300">Already at the recommended destination.</p>}
    {plan.warnings.map((warning) => <p key={warning} className="text-[11px] text-amber-200 flex gap-1.5">
      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{warning}
    </p>)}
    <p className="text-[10px] text-slate-400">Red dashed map route updates with EVA-1. No exploration time is included in an immediate escape. Telemetry and estimates are simulated, not validated life-support predictions.</p>
  </section>;
}
