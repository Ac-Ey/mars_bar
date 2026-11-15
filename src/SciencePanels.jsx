import { useState } from 'react';
import { FlaskConical, Microscope, NotebookPen, Package, Trash2, Waves, Route, ShieldCheck, Sparkles } from 'lucide-react';
import {
  SCIENCE_PROFILES, SPECTRAL_LIBRARY, TUBE_CAPACITY, SCIENCE_TASK_MINUTES,
  mixedSpectrum, reflectanceFor, WAVELENGTHS,
} from './science.js';

const INSTRUMENTS = [
  { id: 'SHERLOC', label: 'SHERLOC', sub: 'Deep-UV Raman / organics', key: 'sherloc' },
  { id: 'PIXL', label: 'PIXL', sub: 'X-ray fluorescence', key: 'pixl' },
  { id: 'SuperCam', label: 'SuperCam', sub: 'LIBS + VISIR', key: 'supercam' },
];

const Card = ({ icon, title, right, children, id }) => (
  <section id={id} className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 flex flex-col gap-3 min-w-0">
    <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400">
      <span className="flex items-center gap-2">{icon}{title}</span>
      {right}
    </div>
    {children}
  </section>
);

export function FieldSciencePanel({ wp, samples, scans, notes, onCollect, onScan, onNote, onRemove, locked }) {
  const profile = SCIENCE_PROFILES[wp.id];
  const [draft, setDraft] = useState('');
  const filled = samples.length;
  const mass = samples.reduce((s, x) => s + x.massKg, 0);
  const wpScans = scans[wp.id] ?? {};
  const wpNotes = notes.filter((n) => n.wpId === wp.id);
  const scienceMinutes = samples.reduce((s, x) => s + SCIENCE_TASK_MINUTES[x.type], 0) +
    Object.values(scans).reduce((s, m) => s + Object.keys(m).reduce((a, k) => a + SCIENCE_TASK_MINUTES[k], 0), 0);
  const full = filled >= TUBE_CAPACITY;

  return (
    <Card id="field-science-panel" icon={<FlaskConical className="w-4 h-4 text-cyan-400" />} title={`Field Science • ${wp.code}`}
      right={<span className={full ? 'text-rose-300' : 'text-cyan-300'}>{filled} / {TUBE_CAPACITY} tubes</span>}>
      <div>
        <div className="flex gap-1" aria-label="Sample tube capacity">
          {Array.from({ length: TUBE_CAPACITY }, (_, i) => (
            <div key={i} title={samples[i] ? `${samples[i].wpCode} ${samples[i].type}` : 'Empty tube'}
              className={`flex-1 h-6 rounded-sm border transition-all duration-300 ${samples[i]
                ? samples[i].type === 'core' ? 'bg-cyan-400/80 border-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-amber-400/70 border-amber-200'
                : 'bg-slate-900 border-slate-700'}`} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-mono text-slate-500">
          <span>PAYLOAD +{mass.toFixed(2)} kg</span>
          <span>SCIENCE TIME {scienceMinutes} min</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button id="collect-core-btn" disabled={locked || full || !profile.coreable} onClick={() => onCollect('core')}
          className="px-2 py-2 rounded-lg text-[11px] font-mono font-semibold border border-cyan-500/50 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-35 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Drill Core
        </button>
        <button id="collect-regolith-btn" disabled={locked || full} onClick={() => onCollect('regolith')}
          className="px-2 py-2 rounded-lg text-[11px] font-mono font-semibold border border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/25 disabled:opacity-35 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Regolith Scoop
        </button>
      </div>
      {!profile.coreable && <p className="text-[10px] text-slate-500 -mt-1.5">Core drilling reserved for SCI targets.</p>}
      {locked && <p className="text-[10px] text-rose-300 -mt-1.5">Science ops suspended during contingency.</p>}

      <div className="space-y-1.5">
        <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1.5"><Microscope className="w-3 h-3" /> Proximity Instruments</div>
        {INSTRUMENTS.map((ins) => {
          const done = wpScans[ins.id];
          const result = profile[ins.key];
          return (
            <div key={ins.id} className={`rounded-lg border p-2 transition ${done ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/60'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-bold text-slate-100">{ins.label}</div>
                  <div className="text-[10px] text-slate-500">{ins.sub} • {SCIENCE_TASK_MINUTES[ins.id]} min</div>
                </div>
                <button id={`scan-${ins.id.toLowerCase()}-btn`} disabled={locked} onClick={() => onScan(ins.id)}
                  className={`shrink-0 px-2 py-1 rounded text-[10px] font-mono border transition disabled:opacity-35 ${done
                    ? 'border-emerald-500/50 text-emerald-300' : 'border-slate-600 text-slate-200 hover:border-cyan-400 hover:text-cyan-200'}`}>
                  {done ? 'RESCAN' : 'SCAN'}
                </button>
              </div>
              {done && (ins.id === 'PIXL' ? (
                <div className="mt-1.5 space-y-0.5">
                  {Object.entries(result).map(([ox, v]) => (
                    <div key={ox} className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="w-9 text-slate-400">{ox}</span>
                      <div className="flex-1 h-1.5 rounded bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-300" style={{ width: `${Math.min(100, v / 0.75)}%` }} />
                      </div>
                      <span className="w-10 text-right text-slate-200">{v}%</span>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-1 text-[10px] font-mono text-emerald-200/90 leading-snug">{result}</p>)}
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1.5"><NotebookPen className="w-3 h-3" /> Field Notes</div>
        <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onNote(draft.trim()); setDraft(''); } }}>
          <input id="field-note-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Observation at ${wp.code}…`}
            className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400" />
          <button id="field-note-save" className="px-2 rounded text-[10px] font-mono border border-slate-600 text-slate-200 hover:border-cyan-400">LOG</button>
        </form>
        <ul className="max-h-20 overflow-y-auto space-y-1">
          {wpNotes.map((n) => (
            <li key={n.id} className="text-[10px] text-slate-300 border-l-2 border-cyan-500/50 pl-2"><span className="font-mono text-slate-500">{n.time}</span> {n.text}</li>
          ))}
        </ul>
      </div>

      {samples.length > 0 && (
        <details className="text-[10px] font-mono text-slate-400">
          <summary className="cursor-pointer hover:text-slate-200">Sample manifest ({samples.length})</summary>
          <ul className="mt-1 space-y-0.5">
            {samples.map((s, i) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span>#{String(i + 1).padStart(2, '0')} {s.wpCode} {s.type.toUpperCase()} {s.massKg.toFixed(2)} kg • {s.time}</span>
                <button aria-label="Discard sample" onClick={() => onRemove(s.id)} className="text-slate-600 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

export function SpectralAnalyzer({ wp, mineralLayer }) {
  const profile = SCIENCE_PROFILES[wp.id];
  const [showComponents, setShowComponents] = useState(true);
  const [activeBand, setActiveBand] = useState(null);
  const W = 300, H = 130, pad = { l: 26, r: 6, t: 8, b: 18 };
  const mix = mixedSpectrum(profile.components);
  const all = [...mix.map((p) => p.r), ...profile.components.flatMap((c) => WAVELENGTHS.map((u) => reflectanceFor(c.key, u)))];
  const rMin = Math.min(...all) - 0.01, rMax = Math.max(...all) + 0.01;
  const sx = (um) => pad.l + ((um - 1.0) / 1.6) * (W - pad.l - pad.r);
  const sy = (r) => pad.t + (1 - (r - rMin) / (rMax - rMin)) * (H - pad.t - pad.b);
  const toPath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.um).toFixed(1)},${sy(p.r).toFixed(1)}`).join(' ');
  const bands = profile.components.flatMap((c) => SPECTRAL_LIBRARY[c.key].bands
    .filter((b) => b.depth >= 0.07).map((b) => ({ ...b, key: c.key, mineral: SPECTRAL_LIBRARY[c.key].name, color: SPECTRAL_LIBRARY[c.key].color })));
  const uniqueBands = bands.filter((b, i) => bands.findIndex((o) => Math.abs(o.um - b.um) < 0.03) === i);

  return (
    <Card id="spectral-analyzer" icon={<Waves className="w-4 h-4 text-violet-400" />} title={`CRISM / PIXL Spectral • ${wp.code}`}
      right={<button onClick={() => setShowComponents((v) => !v)} className="text-[10px] text-slate-500 hover:text-slate-200">
        {showComponents ? 'HIDE' : 'SHOW'} ENDMEMBERS</button>}>
      {!mineralLayer && <p className="text-[10px] text-amber-300/90 -mt-1">Mineral &amp; Biosignatures layer is off — showing cached spectrum.</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-lg bg-slate-900/70 border border-slate-800">
        {[1.0, 1.4, 1.8, 2.2, 2.6].map((u) => (
          <g key={u}>
            <line x1={sx(u)} x2={sx(u)} y1={pad.t} y2={H - pad.b} stroke="rgba(148,163,184,0.12)" strokeWidth="0.5" />
            <text x={sx(u)} y={H - 5} fontSize="7" fill="#64748b" textAnchor="middle" fontFamily="monospace">{u.toFixed(1)}</text>
          </g>
        ))}
        <text x="3" y={pad.t + 4} fontSize="6.5" fill="#64748b" fontFamily="monospace">R</text>
        <text x={W - pad.r} y={H - 5} fontSize="6.5" fill="#64748b" textAnchor="end" fontFamily="monospace">µm</text>
        {uniqueBands.map((b) => (
          <g key={`${b.key}-${b.um}`} className="cursor-pointer" onMouseEnter={() => setActiveBand(b)} onClick={() => setActiveBand(b)}>
            <rect x={sx(b.um) - 4} y={pad.t} width="8" height={H - pad.t - pad.b} fill={activeBand?.um === b.um ? `${b.color}33` : 'transparent'} />
            <line x1={sx(b.um)} x2={sx(b.um)} y1={pad.t} y2={H - pad.b} stroke={b.color} strokeWidth="0.6" strokeDasharray="2 1.5" opacity="0.8" />
            <text x={sx(b.um)} y={pad.t + 6} fontSize="6" fill={b.color} textAnchor="middle" fontFamily="monospace">{b.um.toFixed(2)}</text>
          </g>
        ))}
        {showComponents && profile.components.map((c) => (
          <path key={c.key} d={toPath(WAVELENGTHS.map((um) => ({ um, r: reflectanceFor(c.key, um) })))}
            fill="none" stroke={SPECTRAL_LIBRARY[c.key].color} strokeWidth="0.7" opacity="0.45" />
        ))}
        <path d={toPath(mix)} fill="none" stroke="#f8fafc" strokeWidth="1.4" style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))' }} />
      </svg>
      <div className="min-h-[28px] text-[10px] font-mono leading-snug">
        {activeBand
          ? <span style={{ color: activeBand.color }}>{activeBand.um.toFixed(2)} µm absorption — {activeBand.cause} ({activeBand.mineral})</span>
          : <span className="text-slate-500">Hover an absorption band to see its cause.</span>}
      </div>

      <div className="space-y-1">
        {profile.components.map((c) => (
          <div key={c.key} className="flex items-center gap-2 text-[10px] font-mono">
            <span className="w-2 h-2 rounded-full" style={{ background: SPECTRAL_LIBRARY[c.key].color }} />
            <span className="flex-1 text-slate-300 truncate">{SPECTRAL_LIBRARY[c.key].name}</span>
            <div className="w-20 h-1.5 bg-slate-800 rounded overflow-hidden"><div className="h-full" style={{ width: `${c.pct}%`, background: SPECTRAL_LIBRARY[c.key].color }} /></div>
            <span className="w-8 text-right text-slate-200">{c.pct}%</span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400">
          <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-cyan-400" /> Biosignature Priority</span>
          <span className="text-lg font-bold text-cyan-300 normal-case">{profile.priority}%</span>
        </div>
        <div className="mt-1 flex h-2 rounded overflow-hidden bg-slate-800">
          {profile.factors.map((f, i) => (
            <div key={f.label} title={`${f.label}: +${f.score}`} style={{ width: `${f.score}%` }}
              className={['bg-cyan-400', 'bg-violet-400', 'bg-teal-400', 'bg-amber-400'][i]} />
          ))}
        </div>
        <div className="mt-1 grid grid-cols-2 gap-x-3 text-[10px] font-mono text-slate-400">
          {profile.factors.map((f) => <span key={f.label} className="flex justify-between"><span>{f.label}</span><span className="text-slate-200">+{f.score}</span></span>)}
        </div>
        {profile.rationale && <p className="mt-1.5 text-[10px] text-slate-400 leading-snug">{profile.rationale}</p>}
      </div>
    </Card>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="w-14 text-slate-400">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded overflow-hidden"><div className={`h-full ${color} transition-all duration-500`} style={{ width: `${value ?? 0}%` }} /></div>
      <span className="w-7 text-right text-slate-100">{value ?? '—'}</span>
    </div>
  );
}

export function RouteSciencePanel({ comparison, chosen, onChoose, targetLabel, disabled }) {
  const options = [
    { id: 'safest', title: 'Safety-Optimal', icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />, data: comparison.safest, ring: 'border-amber-400' },
    { id: 'science', title: 'Science-Weighted', icon: <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />, data: comparison.science, ring: 'border-fuchsia-400' },
  ];
  return (
    <Card id="route-science-panel" icon={<Route className="w-4 h-4 text-fuchsia-400" />} title="Science Yield Score"
      right={<span className="text-slate-500">→ {targetLabel}</span>}>
      {disabled ? <p className="text-[11px] text-rose-300">Route comparison paused — emergency escape route active.</p> : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {options.map((o) => {
              const s = o.data.score;
              return (
                <button key={o.id} id={`route-option-${o.id}`} onClick={() => onChoose(o.id)} disabled={!s}
                  className={`text-left p-2.5 rounded-lg border transition disabled:opacity-40 ${chosen === o.id ? `${o.ring} bg-slate-900` : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'}`}>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-100">{o.icon}{o.title}</div>
                  {s ? (
                    <div className="mt-2 space-y-1">
                      <ScoreBar label="SCIENCE" value={s.scienceScore} color="bg-gradient-to-r from-fuchsia-500 to-cyan-400" />
                      <ScoreBar label="SAFETY" value={s.safetyScore} color="bg-gradient-to-r from-amber-500 to-emerald-400" />
                      <div className="pt-1 text-[10px] font-mono text-slate-400 space-y-0.5">
                        <div>{Math.round(s.distanceMeters)} m • clr {Math.round(s.minClearanceMeters)} m</div>
                        <div>in-deposit {Math.round(s.dwellMeters)} m</div>
                      </div>
                    </div>
                  ) : <div className="mt-2 text-[10px] text-slate-500">No safe route</div>}
                </button>
              );
            })}
          </div>
          {comparison.science.score && (
            <div className="space-y-1">
              {comparison.science.score.peaks.map((p, i) => (
                <div key={p.id} className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{p.mineral}</span>
                  <span className="text-slate-200">
                    {Math.round((comparison.safest.score?.peaks[i].peak ?? 0) * 100)}% → <span className="text-fuchsia-300">{Math.round(p.peak * 100)}%</span> proximity
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-500 leading-snug">
            Science score = 75% weighted peak proximity to CRISM deposits + 25% traverse length inside deposits. Safety score = 70% min hazard clearance (80 m = full) + 30% distance efficiency. Hazard cells stay blocked on both routes.
          </p>
        </>
      )}
    </Card>
  );
}
