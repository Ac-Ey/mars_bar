#!/usr/bin/env python3
"""Turn a real Mars DEM (e.g. USGS HiRISE Jezero DTM) into data for the A.R.E.S. map.

Crops a 1 km x 1 km square, computes slope, and writes:
  terrain.json        50x50 hazard grid (1 = blocked) for the A* pathfinder
  slope_overlay.png   transparent PNG, red where slope > threshold (map overlay)
  basemap.png         optional orthoimage crop (if --ortho is given)

Usage:
  python make_terrain.py --dem JEZ_hirise_soc_006_DTM_...tif --ortho JEZ_hirise_..._orthoMosaic_25cm...tif \
      --lat 18.4446 --lon 77.4509 --out public/terrain

Assumes the raster is equirectangular (Eqc, lat_ts 0, lon0 0) on the Mars sphere, as the USGS
Jezero products are. If yours differs, pass --center-x/--center-y in the raster's own meters.
"""
import argparse, json, math, os
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from PIL import Image

MARS_RADIUS_M = 3396190.0
SIZE_M = 1000.0      # map is a 1 km square
GRID = 50            # matches the app's 50x50 A* grid
CELL_PX = 4          # slope pixels per grid cell side (200 px / 50 cells)
SLOPE_PX_M = SIZE_M / (GRID * CELL_PX)   # 5 m baseline for slope


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dem', required=True)
    ap.add_argument('--ortho')
    ap.add_argument('--lat', type=float, default=18.4446)
    ap.add_argument('--lon', type=float, default=77.4509)
    ap.add_argument('--center-x', type=float)
    ap.add_argument('--center-y', type=float)
    ap.add_argument('--threshold', type=float, default=15.0, help='no-go slope, degrees')
    ap.add_argument('--block-fraction', type=float, default=0.25,
                    help='a cell is blocked if this fraction of its pixels exceed the threshold')
    ap.add_argument('--out', default='terrain')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    cx = a.center_x if a.center_x is not None else MARS_RADIUS_M * math.radians(a.lon)
    cy = a.center_y if a.center_y is not None else MARS_RADIUS_M * math.radians(a.lat)
    half = SIZE_M / 2
    bounds = (cx - half, cy - half, cx + half, cy + half)
    n = GRID * CELL_PX

    with rasterio.open(a.dem) as ds:
        win = from_bounds(*bounds, transform=ds.transform)
        dem = ds.read(1, window=win, out_shape=(n, n), resampling=Resampling.average,
                      masked=True, boundless=True).astype('float64').filled(np.nan)

    dzdy, dzdx = np.gradient(dem, SLOPE_PX_M)
    slope = np.degrees(np.arctan(np.hypot(dzdx, dzdy)))
    nodata = np.isnan(slope)
    steep = (slope > a.threshold) | nodata

    cells = steep.reshape(GRID, CELL_PX, GRID, CELL_PX).mean(axis=(1, 3))
    blocked = (cells >= a.block_fraction)

    rgba = np.zeros((n, n, 4), dtype=np.uint8)
    rgba[steep] = (239, 68, 68, 180)
    Image.fromarray(rgba, 'RGBA').resize((1000, 1000), Image.NEAREST).save(f'{a.out}/slope_overlay.png')

    if a.ortho:
        with rasterio.open(a.ortho) as ds:
            win = from_bounds(*bounds, transform=ds.transform)
            img = ds.read(1, window=win, out_shape=(1000, 1000), resampling=Resampling.average,
                          boundless=True).astype('float64')
        lo, hi = np.nanpercentile(img, [2, 98])
        img = np.clip((img - lo) / max(hi - lo, 1e-9), 0, 1)
        Image.fromarray((img * 255).astype('uint8')).save(f'{a.out}/basemap.png')

    # Per-cell mean elevation and mean slope, so waypoint cards can show real numbers.
    def cell_mean(a):
        with np.errstate(all='ignore'):
            m = np.array([[np.nanmean(a[r*CELL_PX:(r+1)*CELL_PX, c*CELL_PX:(c+1)*CELL_PX])
                           for c in range(GRID)] for r in range(GRID)])
        return [[None if np.isnan(v) else round(float(v), 1) for v in row] for row in m]
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        elevation_grid = cell_mean(dem)
        slope_grid = cell_mean(slope)

    valid = dem[~np.isnan(dem)]
    out = {
        'source': os.path.basename(a.dem),
        'centerLatLon': [a.lat, a.lon],
        'sizeMeters': SIZE_M, 'gridSize': GRID, 'cellMeters': SIZE_M / GRID,
        'slopeBaselineMeters': SLOPE_PX_M, 'thresholdDeg': a.threshold,
        'blockFraction': a.block_fraction,
        'elevationMinMax': [float(valid.min()), float(valid.max())] if valid.size else None,
        'maxSlopeDeg': float(np.nanmax(slope)) if valid.size else None,
        'blockedPercent': round(float(blocked.mean() * 100), 1),
        'elevationGrid': elevation_grid,   # mean elevation (m) per cell, row 0 = north
        'slopeGrid': slope_grid,           # mean slope (deg) per cell
        'rows': [''.join('1' if c else '0' for c in row) for row in blocked],  # row 0 = north/top
    }
    with open(f'{a.out}/terrain.json', 'w') as f:
        json.dump(out, f, indent=1)

    print(f"Blocked cells: {out['blockedPercent']}%  |  max slope {out['maxSlopeDeg']:.1f} deg  "
          f"|  elevation {out['elevationMinMax']}")
    for row in out['rows']:
        print(row.replace('1', '#').replace('0', '.'))


if __name__ == '__main__':
    main()
