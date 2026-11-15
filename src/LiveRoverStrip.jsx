import { useEffect, useState } from 'react';
import { fetchLatestRoverImages, daysAgo } from './liveFeed.js';

export function LiveRoverStrip({ onOpen }) {
  const [state, setState] = useState({ status: 'loading', images: [] });

  useEffect(() => {
    let cancelled = false;
    fetchLatestRoverImages().then((r) => {
      if (!cancelled) setState({ status: r.live ? 'latest' : 'archive', images: r.images });
    });
    return () => { cancelled = true; };
  }, []);

  if (state.status === 'loading') {
    return (
      <section aria-label="Latest Perseverance images" className="rounded-lg border border-slate-800 bg-slate-950/90 p-3">
        <p role="status" className="text-[11px] font-mono text-slate-400">
          Contacting NASA raw-image feed…
        </p>
      </section>
    );
  }

  if (state.status === 'archive') {
    return (
      <section aria-label="Latest Perseverance images" className="rounded-lg border border-slate-800 bg-slate-950/90 p-3">
        <p role="status" className="text-[11px] font-mono text-amber-300">
          ARCHIVE — live feed unavailable, showing stored NASA photos
        </p>
      </section>
    );
  }

  const first = state.images[0];
  return (
    <section
      aria-label="Latest Perseverance images"
      className="rounded-lg border border-slate-800 bg-slate-950/90 p-3 space-y-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-mono uppercase tracking-wider text-orange-300">
          Latest · Sol {first.sol}
        </h2>
        <span className="text-[10px] font-mono text-slate-400">
          Taken {daysAgo(first.takenUtc)} days ago
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {state.images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onOpen?.(img)}
            aria-label={`Open ${img.instrument.replace('_', ' ')} image from Sol ${img.sol}`}
            className="group w-36 shrink-0 overflow-hidden rounded-md border border-slate-800 bg-slate-900 text-left transition hover:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"
          >
            <img
              src={img.thumb}
              alt={`${img.instrument.replace('_', ' ')} Sol ${img.sol}`}
              loading="lazy"
              onError={(e) => e.currentTarget.classList.add('hidden')}
              className="h-24 w-full object-cover transition group-hover:scale-105"
            />
            <span className="block truncate px-2 py-1.5 text-[10px] font-mono text-slate-300">
              {img.instrument.replace('_', ' ')} · Sol {img.sol}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[10px] leading-relaxed text-slate-500">
        Public raw images, {first.credit}. The rover&apos;s actual position differs from this simulated scenario.
      </p>
    </section>
  );
}