const BASE = 'https://mars.nasa.gov/rss/api/';
let cache = null; // { at, value } — avoids refetching on every render

export function buildFeedUrl({ num = 60, page = 0 } = {}) {
    const p = new URLSearchParams({
        feed: 'raw_images', category: 'mars2020', feedtype: 'json',
        ver: '1.2', num: String(num), page: String(page), order: 'sol desc',
    });
    return `${BASE}?${p}`;
}

// EBY and ECM are two products of the same frame: collapse them to one key.
const dedupeKey = (id) => id.replace(/(_\d{3}E)(BY|CM)(_)/, '$1$3');

export function normalizeImage(raw) {
    const f = raw.image_files ?? {};
    const url = f.medium ?? f.large ?? f.small;
    if (!raw.imageid || !url) return null;
    return {
        id: raw.imageid,
        sol: raw.sol,
        site: raw.site,
        instrument: raw.camera?.instrument ?? 'UNKNOWN',
        url,
        thumb: f.small ?? url,
        large: f.large ?? url,
        takenUtc: raw.date_taken_utc ? `${raw.date_taken_utc}Z` : null,
        mastElevationDeg: Number.parseFloat(raw.extended?.mastEl),
        credit: raw.credit ?? 'NASA/JPL-Caltech',
        link: raw.link,
        title: raw.title,
    };
}

export async function fetchLatestRoverImages({
    instruments, limit = 6, num = 60, timeoutMs = 6000, maxAgeMs = 10 * 60 * 1000,
} = {}) {
    if (cache && Date.now() - cache.at < maxAgeMs) return cache.value;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(buildFeedUrl({ num }), { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const seen = new Set();
        const images = [];
        for (const raw of data.images ?? []) {
            const img = normalizeImage(raw);
            if (!img) continue;
            if (instruments && !instruments.includes(img.instrument)) continue;
            const key = dedupeKey(img.id);
            if (seen.has(key)) continue;
            seen.add(key);
            images.push(img);
            if (images.length >= limit) break;
        }
        const value = { live: images.length > 0, fetchedAt: new Date().toISOString(), images };
        if (value.live) cache = { at: Date.now(), value };
        return value;
    } catch (err) {
        return { live: false, error: String(err?.message ?? err), images: [] };
    } finally {
        clearTimeout(timer);
    }
}

export const daysAgo = (iso) =>
    iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null;