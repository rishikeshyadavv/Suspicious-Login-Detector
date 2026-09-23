from datetime import datetime
from typing import Tuple
import pandas as pd

CITY_COORDS = {
    "Bangalore": (12.9716, 77.5946),
    "London": (51.5074, -0.1278),
    "Mumbai": (19.0760, 72.8777),
    "Delhi": (28.7041, 77.1025),
    "Chennai": (13.0827, 80.2707),
}

MAX_TRAVEL_SPEED_KMH = 900
MAX_TIME_MIN = 60


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import radians, sin, cos, sqrt, atan2
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def impossible_travel(row: pd.Series, user_history: pd.DataFrame) -> Tuple[bool, str]:
    if user_history.empty:
        return False, ""
    current_city = row["city"]
    current_time = row["timestamp"]
    for _, prev in user_history.iterrows():
        if prev["city"] != current_city:
            time_diff = (current_time - prev["timestamp"]).total_seconds() / 60
            if time_diff < MAX_TIME_MIN:
                # Flat threshold: less than 60 min between different cities = flag
                return True, f"Impossible travel: {prev['city']} → {current_city} in {int(time_diff)} min"
            else:
                # Time allows travel - check if distance can be covered at max speed
                if current_city in CITY_COORDS and prev["city"] in CITY_COORDS:
                    dist = haversine_km(
                        CITY_COORDS[prev["city"]][0], CITY_COORDS[prev["city"]][1],
                        CITY_COORDS[current_city][0], CITY_COORDS[current_city][1]
                    )
                    min_time = (dist / MAX_TRAVEL_SPEED_KMH) * 60
                    if time_diff < min_time:
                        return True, f"Impossible travel: {prev['city']} → {current_city} in {int(time_diff)} min"
    return False, ""


def new_device(row: pd.Series, user_history: pd.DataFrame) -> Tuple[bool, str]:
    if user_history.empty:
        return False, ""
    seen_devices = set(user_history["device"].unique())
    if row["device"] not in seen_devices:
        return True, f"New device for this user: {row['device']}"
    return False, ""


def off_hours(row: pd.Series, user_history: pd.DataFrame) -> Tuple[bool, str]:
    login_hour = row["timestamp"].hour
    if user_history.empty:
        if login_hour < 6 or login_hour > 23:
            return True, f"Off-hours login at {row['timestamp'].strftime('%H:%M')}"
        return False, ""
    hours = user_history["timestamp"].dt.hour
    min_hour, max_hour = hours.min(), hours.max()
    if login_hour < min_hour or login_hour > max_hour:
        return True, f"Off-hours login at {row['timestamp'].strftime('%H:%M')}"
    return False, ""


def failed_burst(row: pd.Series, user_history: pd.DataFrame) -> Tuple[bool, str]:
    if user_history.empty:
        return False, ""
    current_time = row["timestamp"]
    same_hour = user_history[
        (user_history["timestamp"].dt.hour == current_time.hour) &
        (user_history["timestamp"] < current_time)
    ]
    fails = same_hour[same_hour["login_result"] == "fail"]
    if len(fails) >= 3:
        return True, f"{len(fails)} failed attempts before this login"
    return False, ""


def run_all_rules(row: pd.Series, user_history: pd.DataFrame):
    reasons = []
    flags = {}
    flags["impossible_travel"], reason = impossible_travel(row, user_history)
    if reason:
        reasons.append(reason)
    flags["new_device"], reason = new_device(row, user_history)
    if reason:
        reasons.append(reason)
    flags["off_hours"], reason = off_hours(row, user_history)
    if reason:
        reasons.append(reason)
    flags["failed_burst"], reason = failed_burst(row, user_history)
    if reason:
        reasons.append(reason)
    return flags, reasons