from pathlib import Path
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.climate import compute_climate_yield, get_market_facts
from backend.landuse import classify_indian_terrain
from backend.terrain import (
    assess_natural_hazards,
    evaluate_elevation_metrics,
    get_surrounding_coords,
    infer_indian_state_focus,
)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(title="Kalpa")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


class AnalyzeRequest(BaseModel):
    lat: float
    lng: float
    place_name: str = ""
    plot_area_sqm: float = 150.0
    purpose: str = "Buying a Plot"


@app.get("/")
async def serve_frontend():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/api/geocode")
async def geocode_place(q: str):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": f"{q}, India", "format": "json", "limit": 1}
    headers = {"User-Agent": "KalpaSpatialAdvisor/1.0"}
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(url, params=params, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Geocoding service temporarily unavailable")
        results = resp.json()
        if not results:
            raise HTTPException(status_code=404, detail="Location not found in India")
        return {
            "lat": float(results[0]["lat"]),
            "lng": float(results[0]["lon"]),
            "display_name": results[0]["display_name"],
        }


@app.get("/api/reverse-geocode")
async def reverse_geocode(lat: float, lng: float):
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"lat": lat, "lon": lng, "format": "json", "zoom": 12}
    headers = {"User-Agent": "KalpaSpatialAdvisor/1.0"}
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(url, params=params, headers=headers)
            data = resp.json()
            name = data.get("display_name") or f"{lat:.3f}° N, {lng:.3f}° E"
            return {"display_name": name}
        except Exception:
            return {"display_name": f"{lat:.3f}° N, {lng:.3f}° E"}


@app.post("/api/analyze")
async def analyze_plot(req: AnalyzeRequest):
    points = get_surrounding_coords(req.lat, req.lng, radius_m=400.0)
    lats = ",".join(f"{p[1]:.5f}" for p in points)
    lngs = ",".join(f"{p[2]:.5f}" for p in points)

    elev_url = f"https://api.open-meteo.com/v1/elevation?latitude={lats}&longitude={lngs}"
    weather_url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={req.lat:.5f}&longitude={req.lng:.5f}"
        f"&daily=precipitation_sum,shortwave_radiation_sum&timezone=Asia%2FKolkata"
    )

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            elev_resp, weather_resp = await client.get(elev_url), await client.get(weather_url)
            elevations = elev_resp.json().get("elevation", [100.0] * 9)
            weather_data = weather_resp.json().get("daily", {})
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Orbital feed timeout: {str(e)}")

    elev = evaluate_elevation_metrics(elevations)
    climate = compute_climate_yield(weather_data, req.plot_area_sqm)
    terrain_ctx = classify_indian_terrain(req.lat, req.lng)
    hazards = assess_natural_hazards(
        req.lat, req.lng, elev["rel_elevation"], elev["slope_pct"], climate["rain_7d_mm"]
    )
    state_focus = infer_indian_state_focus(req.lat, req.lng)

    kalpa_score = round(
        0.35 * elev["elev_score"]
        + 0.30 * terrain_ctx["waterbody_score"]
        + 0.20 * terrain_ctx["bhujal_score"]
        + 0.15 * climate["climate_score"]
    )

    if kalpa_score >= 75:
        status = "PRIME TERRAIN"
        tone = "emerald"
    elif kalpa_score >= 55:
        status = "MODERATE — ENGINEERED MITIGATION"
        tone = "amber"
    else:
        status = "HIGH FLOOD / TERRAIN RISK"
        tone = "rose"

    recommended_plinth_ft = 4.5 if elev["rel_elevation"] < -0.6 else 2.5
    plinth = (
        f"a {recommended_plinth_ft} ft raised RCC plinth with perimeter storm drainage"
        if elev["rel_elevation"] < -0.6
        else f"a standard {recommended_plinth_ft} ft plinth with clean surface runoff"
    )
    location_label = req.place_name if req.place_name else f"{req.lat:.3f}° N, {req.lng:.3f}° E"

    checklist = [
        f"Verify local municipal drainage & historical revenue/waterbody boundaries for {req.purpose.lower()}.",
        f"Plan {plinth} and confirm soil bearing capacity before foundation work.",
        f"Integrate a rainwater recharge pit (~{climate['annual_rainwater_liters']:,} L/yr potential) and rooftop solar provision.",
    ]

    return {
        "location_name": location_label,
        "state_focus": state_focus,
        "coordinates": {"lat": round(req.lat, 4), "lng": round(req.lng, 4)},
        "plot_area_sqm": round(climate["area_sqm"], 1),
        "purpose": req.purpose,
        "kalpa_score": kalpa_score,
        "status": status,
        "tone": tone,
        "breakdown": {
            "elevation": {"score": elev["elev_score"], "weight": "35%"},
            "waterbody": {"score": terrain_ctx["waterbody_score"], "weight": "30%"},
            "groundwater": {"score": terrain_ctx["bhujal_score"], "weight": "20%"},
            "climate": {"score": climate["climate_score"], "weight": "15%"},
        },
        "plinth_comparison": {
            "unprepared": "1.0–1.5 ft flush plinth risks road-water backflow and dampness in heavy monsoon spells.",
            "recommended": f"{recommended_plinth_ft} ft raised plinth + perimeter drain channel protects structure and sub-base.",
        },
        "metrics": {
            "elevation_asl": f"{elev['center_elev']:.1f} m",
            "relative_elevation": f"{elev['rel_elevation']:+.2f} m",
            "slope": f"{elev['slope_pct']}%",
            "drainage_status": elev["drainage_status"],
            "historical_lulc": terrain_ctx["historical_lulc"],
            "groundwater": terrain_ctx["groundwater"],
            "soil": terrain_ctx["soil"],
            "rainwater_yield": f"{climate['annual_rainwater_liters']:,} L / yr",
            "solar_yield": f"{climate['est_solar_daily_kwh']} kWh / day",
            "rain_7d": f"{climate['rain_7d_mm']} mm",
        },
        "hazards": hazards,
        "market_facts": get_market_facts(),
        "checklist": checklist,
        "verdict_en": (
            f"For {req.purpose.lower()} on ~{climate['area_sqm']:.0f} sq.m at {elev['center_elev']:.1f}m ASL "
            f"({elev['rel_elevation']:+.2f}m vs. 400m surroundings), the site shows {elev['drainage_status'].lower()}. "
            f"Use {plinth} and pair site grading with ~{climate['annual_rainwater_liters']:,} L/yr rainwater harvesting."
        ),
        "verdict_hi": (
            f"{req.purpose} (~{climate['area_sqm']:.0f} वर्ग मीटर) के लिए {elev['center_elev']:.1f} मीटर ऊँचाई "
            f"(आसपास से {elev['rel_elevation']:+.2f} मीटर) पर यह स्थल {elev['drainage_status']} की स्थिति दिखाता है। "
            f"{plinth} अपनाएँ और ~{climate['annual_rainwater_liters']:,} लीटर/वर्ष वर्षा जल संचयन का प्रावधान रखें।"
        ),
    }