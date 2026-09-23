import pandas as pd
from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
from .column_mapper import map_columns, CANONICAL_FIELDS
from .rules import run_all_rules, CITY_COORDS
from .scoring import score

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLE_CSV = BASE_DIR / "backend" / "sample_logins.csv"

ERROR_MESSAGE = "Couldn't parse that CSV — check columns match: user, timestamp, ip, city, device, login_result"


def analyze_csv(df: pd.DataFrame) -> list:
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by=["user", "timestamp"]).reset_index(drop=True)
    results = []
    for idx, row in df.iterrows():
        history = df[(df["user"] == row["user"]) & (df.index < idx)]
        flags, reasons = run_all_rules(row, history)
        risk_score, risk_level = score(flags)
        coords = CITY_COORDS.get(row["city"])
        results.append({
            "id": idx,
            "user": row["user"],
            "timestamp": row["timestamp"].strftime("%Y-%m-%dT%H:%M:%S"),
            "ip": row["ip"],
            "city": row["city"],
            "device": row["device"],
            "lat": coords[0] if coords else None,
            "lon": coords[1] if coords else None,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "reasons": reasons,
        })
    return results


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(pd.io.common.BytesIO(contents))
    except Exception:
        return JSONResponse(status_code=400, content={"error": ERROR_MESSAGE})

    required = set(CANONICAL_FIELDS)
    headers = list(df.columns)

    if set(headers) != required:
        mapping = map_columns(headers)
        if not mapping or not required.issubset(set(mapping.keys())):
            return JSONResponse(status_code=400, content={"error": ERROR_MESSAGE})
        df = df.rename(
            columns={
                mapped: canonical
                for canonical, mapped in mapping.items()
                if mapped in headers
            }
        )
        if not required.issubset(set(df.columns)):
            return JSONResponse(status_code=400, content={"error": ERROR_MESSAGE})

    return analyze_csv(df)


@app.get("/sample")
async def sample():
    df = pd.read_csv(SAMPLE_CSV)
    return analyze_csv(df)


@app.get("/")
async def root():
    return FileResponse(BASE_DIR / "frontend" / "index.html")


app.mount("/", StaticFiles(directory=BASE_DIR / "frontend", html=True), name="frontend")