import { useEffect, useMemo, useRef, useState } from 'react';
import { createWalk, advanceWalk, walkPosition, assessReturn } from './evaWalk.js';

// Drives a live EVA walk along a route. Call start(points, o2) to (re)start,
// e.g. start(emergencyPlan.route.points, walk.oxygenPct) to reroute mid-walk.
export function useEvaWalk() {
  const [walk, setWalk] = useState(null);
  const [running, setRunning] = useState(false);
  const [speedup, setSpeedup] = useState(20); // demo speed: 20x
  const walkRef = useRef(walk);
  const speedRef = useRef(speedup);
  useEffect(() => { speedRef.current = speedup; }, [speedup]);

  useEffect(() => {
    if (!running) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.25)); // ignore clock jitter and tab-switch jumps
      last = now;
      const current = walkRef.current;
      if (!current) return;
      const next = advanceWalk(current, dt, speedRef.current);
      walkRef.current = next;
      setWalk(next);
      if (next.done) {
        setRunning(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const start = (points, oxygenPct) => {
    const prev = walkRef.current;
    const next = createWalk(points, oxygenPct);
    const continuing = prev && !prev.done;
    const nextWalk = {
      ...next,
      origin: continuing ? prev.origin : next.origin,
      startingOxygenPct: continuing ? prev.startingOxygenPct : oxygenPct,
    };
    walkRef.current = nextWalk;
    setWalk(nextWalk);
    setRunning(!nextWalk.done);
  };
  const reset = () => {
    walkRef.current = null;
    setRunning(false);
    setWalk(null);
  };

  return {
    walk, running, speedup, setSpeedup,
    position: walk ? walkPosition(walk) : null,
    // Rerouting mid-walk keeps the ORIGINAL start point and O₂, so Reset restores the real beginning.
    start,
    pause: () => setRunning(false),
    resume: () => { if (walkRef.current && !walkRef.current.done) setRunning(true); },
    reset,
  };
}

// Re-runs A* only when position/O₂ change meaningfully (keeps 60fps smooth).
export function useReturnSafety({ position, oxygenPct, reservePct, home, terrain, enabled }) {
  const kx = position ? Math.round(position.x * 2) : null; // 0.5-unit steps
  const ky = position ? Math.round(position.y * 2) : null;
  const ko = Math.round(oxygenPct * 10);
  return useMemo(() => {
    if (!enabled || kx === null) return null;
    return assessReturn({ position: { x: kx / 2, y: ky / 2 }, availableOxygenPct: ko / 10,
      reservePct, home, terrain });
  }, [enabled, kx, ky, ko, reservePct, home, terrain]);
}
