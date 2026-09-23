import json
import os

from dotenv import load_dotenv

CANONICAL_FIELDS = ["user", "timestamp", "ip", "city", "device", "login_result"]

GROQ_MODEL = "openai/gpt-oss-20b"

SYSTEM_PROMPT = (
    "You map CSV column headers to a canonical login-log schema. "
    "Input is a JSON array of column names from one CSV file. "
    "Reply with STRICT JSON only, no prose, no code fences. "
    "The JSON must be an object whose keys are exactly the canonical fields "
    "user, timestamp, ip, city, device, login_result. "
    "For each canonical field, set its value to the exact input column name "
    "that best matches its meaning; set null if no reasonable match exists. "
    "Do not invent column names that are not in the input."
)


def build_mapping_prompt(csv_headers):
    return {
        "headers": csv_headers,
        "output_schema": {
            "user": "<exact input header or null>",
            "timestamp": "<exact input header or null>",
            "ip": "<exact input header or null>",
            "city": "<exact input header or null>",
            "device": "<exact input header or null>",
            "login_result": "<exact input header or null>",
        },
    }


def _extract_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in response")
    return json.loads(text[start : end + 1])


def map_columns(csv_headers):
    """Map arbitrary CSV headers to the canonical schema via Groq.

    Returns a dict {canonical_field: matching_csv_header, ...} for the fields
    Groq could match, or {} on any failure. Never raises.
    """
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {}

    payload = build_mapping_prompt(list(csv_headers))

    try:
        from groq import Groq

        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload)},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or ""
        parsed = _extract_json(content)
        if not isinstance(parsed, dict):
            return {}
        allowed = set(csv_headers)
        mapping = {}
        for field in CANONICAL_FIELDS:
            value = parsed.get(field)
            if isinstance(value, str) and value in allowed:
                mapping[field] = value
        return mapping
    except Exception:
        return {}