from typing import Tuple


def score(flags: dict) -> Tuple[float, str]:
    score_val = 0.0
    if flags.get("impossible_travel"):
        score_val += 0.4
    if flags.get("new_device"):
        score_val += 0.2
    if flags.get("off_hours"):
        score_val += 0.15
    if flags.get("failed_burst"):
        score_val += 0.25

    if score_val >= 0.5:
        risk_level = "High"
    elif score_val >= 0.2:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return round(score_val, 2), risk_level