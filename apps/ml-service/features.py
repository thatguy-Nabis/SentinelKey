import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

FEATURE_NAMES = [
    "hour_norm",               # 0.0 to 1.0 (hour / 24.0)
    "is_night_hours",          # 1.0 if between 22:00 and 06:00, else 0.0
    "is_weekend",              # 1.0 if Saturday/Sunday, else 0.0
    "failed_login_ratio_1h",   # 0.0 to 1.0 ratio of failed attempts in past hour
    "event_burst_5m",          # Count of events from same IP/user in past 5 minutes
    "geo_distance_km",         # Haversine distance in km from last known position
    "geo_velocity_kmh",        # Speed in km/h based on elapsed time to last event
    "distinct_ips_24h",        # Number of unique IPs observed for user in last 24h
]


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Haversine great-circle distance between two GPS coordinates in kilometers."""
    earth_radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return earth_radius_km * c


def parse_timestamp(ts: Any) -> datetime:
    """Parse ISO timestamp string or integer/float epoch timestamp into UTC datetime."""
    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            return ts.replace(tzinfo=timezone.utc)
        return ts
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    if isinstance(ts, str):
        cleaned = ts.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(cleaned)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def extract_features(
    event: Dict[str, Any], history: Optional[List[Dict[str, Any]]] = None
) -> List[float]:
    """
    Extract a normalized numerical feature vector from a SecurityEvent and its trailing history.
    Returns: [hour_norm, is_night_hours, is_weekend, failed_login_ratio_1h,
              event_burst_5m, geo_distance_km, geo_velocity_kmh, distinct_ips_24h]
    """
    history = history or []

    # 1. Time-of-day features
    event_time = parse_timestamp(event.get("timestamp") or event.get("createdAt"))
    hour = event_time.hour + (event_time.minute / 60.0)
    hour_norm = hour / 24.0
    is_night_hours = 1.0 if (event_time.hour < 6 or event_time.hour >= 22) else 0.0
    is_weekend = 1.0 if event_time.weekday() >= 5 else 0.0

    # 2. History-dependent features
    now_epoch = event_time.timestamp()
    one_hour_ago = now_epoch - 3600
    five_min_ago = now_epoch - 300
    twenty_four_hours_ago = now_epoch - 86400

    recent_1h_logins = 0
    recent_1h_failures = 0
    event_burst_5m = 1.0  # Current event counts as at least 1
    distinct_ips = {str(event.get("ip", ""))}

    meta = event.get("metadata") or {}
    cur_loc = meta.get("location") if isinstance(meta, dict) else None
    cur_lat = cur_loc.get("latitude") if isinstance(cur_loc, dict) else None
    cur_lon = cur_loc.get("longitude") if isinstance(cur_loc, dict) else None

    last_loc_event = None
    min_time_delta_sec = float("inf")

    for past in history:
        past_time = parse_timestamp(past.get("timestamp") or past.get("createdAt"))
        past_epoch = past_time.timestamp()
        delta_sec = now_epoch - past_epoch

        if delta_sec < 0:
            continue  # Future event in synthetic seed, ignore

        past_ip = str(past.get("ip", ""))
        past_type = str(past.get("type", ""))

        # 24h distinct IPs
        if delta_sec <= 86400 and past_ip:
            distinct_ips.add(past_ip)

        # 5m burst
        if delta_sec <= 300:
            event_burst_5m += 1.0

        # 1h login failure ratio
        if delta_sec <= 3600 and "AUTH_LOGIN" in past_type:
            recent_1h_logins += 1
            if "FAILED" in past_type:
                recent_1h_failures += 1

        # Track closest prior event with geo coordinates
        past_meta = past.get("metadata") or {}
        p_loc = past_meta.get("location") if isinstance(past_meta, dict) else None
        if p_loc and isinstance(p_loc, dict) and p_loc.get("latitude") is not None:
            if 0 < delta_sec < min_time_delta_sec:
                min_time_delta_sec = delta_sec
                last_loc_event = (p_loc.get("latitude"), p_loc.get("longitude"), delta_sec)

    # Failed login ratio
    if "AUTH_LOGIN_FAILED" in str(event.get("type", "")):
        recent_1h_logins += 1
        recent_1h_failures += 1
    elif "AUTH_LOGIN" in str(event.get("type", "")):
        recent_1h_logins += 1

    failed_login_ratio_1h = (
        (recent_1h_failures / recent_1h_logins) if recent_1h_logins > 0 else 0.0
    )

    # Geo distance and velocity
    geo_distance_km = 0.0
    geo_velocity_kmh = 0.0

    if cur_lat is not None and cur_lon is not None and last_loc_event is not None:
        p_lat, p_lon, delta_sec = last_loc_event
        geo_distance_km = haversine_distance_km(cur_lat, cur_lon, p_lat, p_lon)
        hours = max(delta_sec / 3600.0, 0.001)  # At least ~3.6s to avoid division by zero
        geo_velocity_kmh = geo_distance_km / hours

    distinct_ips_24h = float(len(distinct_ips))

    return [
        round(hour_norm, 4),
        float(is_night_hours),
        float(is_weekend),
        round(failed_login_ratio_1h, 4),
        float(event_burst_5m),
        round(geo_distance_km, 2),
        round(geo_velocity_kmh, 2),
        float(distinct_ips_24h),
    ]
