import { Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react';

const STYLE = {
  OK: ['text-emerald-300 border-emerald-500/50 bg-emerald-950/40', 'RETURN SAFE'],
  WARNING: ['text-amber-300 border-amber-500/50 bg-amber-950/40', 'APPROACHING POINT OF NO RETURN'],
  TURN_BACK: ['text-red-300 border-red-500/60 bg-red-950/50 animate-pulse', 'TURN BACK NOW'],
  CRITICAL: ['text-red-200 border-red-500 bg-red-900/60 animate-pulse', 'CRITICAL — O₂ BELOW RETURN COST'],
  NO_ROUTE: ['text-red-300 border-red-500/50 bg-red-950/40', 'NO ROUTE HOME'],
};

export function EvaWalkPanel({ walk, running, speedup, setSpeedup, safety, routeAvailable,
  onStart, onPause, onResume, onReset }) {
  const progress = walk ? Math.round((walk.walkedMeters / Math.max(walk.totalMeters, 1)) * 100) : 0;
  const [cls, label] = STYLE[safety?.status] ?? STYLE.OK;
  return (
    <section aria-label="Live EVA walk" className="rounded-lg border border-slate-800 bg-slate-950/90 p-3 space-y-2">
      <h2 className="text-xs font-mono text-orange-300">LIVE EVA WALK • SIMULATION</h2>
      <div className="flex gap-2">
        {!walk || walk.done
          ? <button type="button" onClick={onStart} disabled={!routeAvailable}
            className="flex-1 rounded border border-orange-500/60 px-2 py-1 text-xs font-mono text-orange-200 flex items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"><Play className="w-3 h-3" /> Start EVA</button>
          : <button type="button" onClick={running ? onPause : onResume} className="flex-1 rounded border border-orange-500/60 px-2 py-1 text-xs font-mono text-orange-200 flex items-center justify-center gap-1">{running ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}</button>}
        <button type="button" onClick={onReset} aria-label="Reset walk" className="rounded border border-slate-700 px-2 py-1 text-slate-300"><RotateCcw className="w-3 h-3" /></button>
        <select aria-label="Simulation speed" value={speedup} onChange={(e) => setSpeedup(Number(e.target.value))}
          className="rounded border border-slate-700 bg-slate-900 px-1 text-xs font-mono text-slate-200">
          {[1, 10, 20, 50].map((s) => <option key={s} value={s}>{s}x</option>)}
        </select>
      </div>
      {walk && <>
        <div className="h-1.5 rounded bg-slate-800"><div className="h-full rounded bg-orange-400" style={{ width: `${progress}%` }} /></div>
        <p className="text-[11px] font-mono text-slate-300">{Math.round(walk.walkedMeters)} / {Math.round(walk.totalMeters)} m • O₂ {walk.oxygenPct.toFixed(1)}%</p>
      </>}
      {safety && <div role="alert" className={`rounded border px-2 py-1 text-[11px] font-mono flex items-start gap-1.5 ${cls}`}>
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
        <span>{label}{Number.isFinite(safety.returnOxygenPct) && <> • return {safety.returnOxygenPct.toFixed(1)}% • slack {safety.slackPct.toFixed(1)}%</>}</span>
      </div>}
    </section>
  );
}
