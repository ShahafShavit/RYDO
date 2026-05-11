"""
Deterministic physics-based route intensity from GPX geometry.

W_grav = m * g * sum(delta_h+), W_roll = C_rr * m * g * d,
density = (W_grav + kinetic_factor * W_roll) / distance_km,
with kinetic_factor from rolling-window sinuosity (SI_p90).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import gpxpy
import numpy as np
import pandas as pd


EARTH_RADIUS_M = 6_371_000.0


@dataclass
class PhysicsParams:
    """Default constants (tunable in notebook)."""

    mass_kg: float = 85.0
    g: float = 9.80665
    c_rr: float = 0.02
    # Odd window length for centered rolling median on elevation (points).
    elev_smooth_window: int = 5
    # Minimum horizontal segment length (m) to count toward grade / avoid div-by-zero.
    min_segment_m: float = 0.5
    # Rolling arc length (m) for local sinuosity windows.
    si_window_m: float = 50.0
    # kinetic_factor = 1 + beta * (SI_p90 - 1) ** gamma; applied only to W_roll.
    beta: float = 1.0
    gamma: float = 1.0
    # Normalization: map corpus density percentiles to 1..10
    norm_low_pct: float = 5.0
    norm_high_pct: float = 95.0


def haversine_m(lat1: np.ndarray, lon1: np.ndarray, lat2: np.ndarray, lon2: np.ndarray) -> np.ndarray:
    """Vectorized great-circle distance in meters (WGS84 sphere)."""
    rlat1 = np.radians(lat1)
    rlat2 = np.radians(lat2)
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat / 2.0) ** 2 + np.cos(rlat1) * np.cos(rlat2) * np.sin(dlon / 2.0) ** 2
    c = 2.0 * np.arctan2(np.sqrt(np.clip(a, 0.0, 1.0)), np.sqrt(np.clip(1.0 - a, 0.0, 1.0)))
    return EARTH_RADIUS_M * c


def haversine_pair(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return float(haversine_m(np.array([lat1]), np.array([lon1]), np.array([lat2]), np.array([lon2]))[0])


def parse_gpx_points(path: str | Path) -> pd.DataFrame:
    """Load GPX track points into columns lat, lon, ele_m (nullable)."""
    path = Path(path)
    with path.open("r", encoding="utf-8") as f:
        gpx = gpxpy.parse(f)

    rows: list[tuple[float, float, float | None]] = []
    for trk in gpx.tracks:
        for seg in trk.segments:
            for p in seg.points:
                ele = None if p.elevation is None else float(p.elevation)
                rows.append((float(p.latitude), float(p.longitude), ele))

    if not rows:
        raise ValueError(f"No track points in {path}")

    df = pd.DataFrame(rows, columns=["lat", "lon", "ele_m"])
    # Fill missing elevation for smoothing / deltas.
    s = df["ele_m"].astype(float)
    s = s.interpolate(method="linear", limit_direction="both")
    s = s.bfill().ffill()
    df["ele_m"] = s
    return df


def smooth_elevation(ele: pd.Series | np.ndarray, window: int) -> np.ndarray:
    """Rolling median (centered); window must be odd >= 3."""
    w = max(3, window | 1)  # force odd
    ser = pd.Series(np.asarray(ele, dtype=float))
    return ser.rolling(window=w, center=True, min_periods=1).median().to_numpy()


def segment_horiz_ds_lat_lon(lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    """Horizontal segment lengths between consecutive points (len n-1)."""
    return haversine_m(lat[:-1], lon[:-1], lat[1:], lon[1:])


def rolling_sinuosity_p90(
    lat: np.ndarray,
    lon: np.ndarray,
    cum_dist_m: np.ndarray,
    window_m: float,
    min_chord_m: float = 1.0,
) -> tuple[float, float, float]:
    """
    Local SI = arc_length / chord for windows of arc length ~window_m.
    Returns (mean_si, p90_si, max_si).
    """
    n = len(lat)
    if n < 3:
        return 1.0, 1.0, 1.0

    si_list: list[float] = []
    j = 0
    for i in range(n - 1):
        while j < n and cum_dist_m[j] - cum_dist_m[i] < window_m:
            j += 1
        if j >= n:
            break
        arc = float(cum_dist_m[j] - cum_dist_m[i])
        chord = haversine_pair(lat[i], lon[i], lat[j], lon[j])
        if chord < min_chord_m:
            continue
        si_list.append(arc / chord)

    if not si_list:
        return 1.0, 1.0, 1.0

    arr = np.array(si_list, dtype=float)
    return float(np.mean(arr)), float(np.percentile(arr, 90)), float(np.max(arr))


def global_sinuosity(lat: np.ndarray, lon: np.ndarray, cum_dist_m: np.ndarray) -> float:
    """Path length / chord from first to last point."""
    path_m = float(cum_dist_m[-1] - cum_dist_m[0])
    chord = haversine_pair(float(lat[0]), float(lon[0]), float(lat[-1]), float(lon[-1]))
    if chord < 1.0:
        return 1.0
    return path_m / chord


def kinetic_factor(si_p90: float, params: PhysicsParams) -> float:
    """kinetic_factor = 1 + beta * (SI_p90 - 1) ** gamma."""
    x = max(si_p90 - 1.0, 0.0)
    return 1.0 + params.beta * (x**params.gamma)


def compute_track_physics(df: pd.DataFrame, params: PhysicsParams | None = None) -> dict[str, Any]:
    """
    Compute mechanical metrics from a track DataFrame (lat, lon, ele_m smoothed or raw).
    """
    p = params or PhysicsParams()
    lat = df["lat"].to_numpy(dtype=float)
    lon = df["lon"].to_numpy(dtype=float)
    ele_raw = df["ele_m"].to_numpy(dtype=float)
    ele = smooth_elevation(ele_raw, p.elev_smooth_window)

    ds = segment_horiz_ds_lat_lon(lat, lon)
    ds = np.maximum(ds, 0.0)
    # Mask tiny segments
    valid = ds >= p.min_segment_m
    dh = np.diff(ele)

    d_total_m = float(np.sum(ds))
    if d_total_m < p.min_segment_m:
        raise ValueError("Track horizontal distance is negligible")

    # Positive-only elevation sum on smoothed profile (same index alignment as ds)
    dh_pos = np.maximum(dh, 0.0)
    elev_gain_m = float(np.sum(np.where(valid, dh_pos, 0.0)))

    # Recompute total distance only from valid segments for W_roll consistency
    d_for_roll = float(np.sum(np.where(valid, ds, 0.0)))
    if d_for_roll < 1.0:
        d_for_roll = d_total_m

    w_grav = p.mass_kg * p.g * elev_gain_m
    w_roll = p.c_rr * p.mass_kg * p.g * d_for_roll

    cum = np.concatenate([[0.0], np.cumsum(ds)])
    si_mean, si_p90, si_max = rolling_sinuosity_p90(lat, lon, cum, p.si_window_m)
    si_global = global_sinuosity(lat, lon, cum)

    kf = kinetic_factor(si_p90, p)

    d_km = d_for_roll / 1000.0
    density_j_per_m = (w_grav + kf * w_roll) / d_for_roll
    density_j_per_km = density_j_per_m * 1000.0

    return {
        "distance_m": d_for_roll,
        "distance_km": d_km,
        "elevation_gain_m_smoothed": elev_gain_m,
        "W_grav_J": w_grav,
        "W_roll_J": w_roll,
        "si_mean": si_mean,
        "si_p90": si_p90,
        "si_max": si_max,
        "si_global": si_global,
        "kinetic_factor": kf,
        "intensity_density_J_per_km": density_j_per_km,
        "params_snapshot": {
            "mass_kg": p.mass_kg,
            "g": p.g,
            "c_rr": p.c_rr,
            "elev_smooth_window": p.elev_smooth_window,
            "si_window_m": p.si_window_m,
            "beta": p.beta,
            "gamma": p.gamma,
        },
    }


def normalize_density_to_score(
    densities: np.ndarray,
    low_pct: float = 5.0,
    high_pct: float = 95.0,
) -> tuple[np.ndarray, float, float]:
    """
    Map density values to [1, 10] by clipping to [P_low, P_high] then linear scaling.
    Uses nanpercentile so NaN densities do not poison percentiles (unlike np.percentile).
    Rows with non-finite density get score NaN.
    Returns (scores, lo, hi).
    """
    d = np.asarray(densities, dtype=float)
    if not np.isfinite(d).any():
        raise ValueError("No finite density values for normalization.")
    lo = float(np.nanpercentile(d, low_pct))
    hi = float(np.nanpercentile(d, high_pct))
    if not np.isfinite(lo) or not np.isfinite(hi):
        raise ValueError("Normalization percentiles are not finite; check density inputs.")
    if hi <= lo + 1e-15:
        hi = lo + 1e-15
    clipped = np.clip(d, lo, hi)
    scores = 1.0 + (clipped - lo) / (hi - lo) * 9.0
    return scores, lo, hi


def density_to_score_1_10(density: float, lo: float, hi: float) -> float:
    """
    Map one intensity density (J/km) to [1, 10] using fixed bounds.

    Use the same rule as ``normalize_density_to_score``: clip to [lo, hi], then linear
    scale to [1, 10]. Bounds are typically set once from a reference corpus (e.g. P5/P95
    of densities) and stored as constants so new GPX files do not need the full dataset.
    """
    if not np.isfinite(density):
        return float("nan")
    if not np.isfinite(lo) or not np.isfinite(hi):
        raise ValueError("Calibration bounds lo and hi must be finite.")
    if hi <= lo + 1e-15:
        hi = lo + 1e-15
    clipped = float(np.clip(density, lo, hi))
    return 1.0 + (clipped - lo) / (hi - lo) * 9.0


def load_gpx_metrics(path: str | Path, params: PhysicsParams | None = None) -> dict[str, Any]:
    """Convenience: parse GPX and compute physics metrics."""
    df = parse_gpx_points(path)
    out = compute_track_physics(df, params)
    out["gpx_path"] = str(Path(path).resolve())
    return out
