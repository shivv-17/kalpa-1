# Kalpa — Spatial Land & Terrain Intelligence

**Kalpa** is a site-readiness and terrain advisory web app built for evaluating plots, neighborhoods, and construction sites across India. Instead of relying only on surface impressions or dry-season site visits, Kalpa combines a 3D interactive globe, a 9-point elevation and slope check, regional land-use and aquifer framing, hazard awareness, rainwater and solar yield estimates, and build-scenario comparisons into one workflow.

---

## How Kalpa Works

1. **Explore the 8-Section Story:** Scroll through Kalpa's landing sections to understand terrain & drainage physics, the 4-layer scoring model, Indian land/real estate considerations, natural hazards, rainwater & solar potential, plinth/grading trade-offs, and pre-purchase steps.
2. **Search, Click the Globe, or Use Location:** Open **Kalpa Analyzer** (or **Scan Land**), enter a city/town/locality in India, use your current location, or click directly on India on the 3D Earth.
3. **Inspect Terrain & Build Trade-Offs:** View the Kalpa Score, map pin, elevation relative to the surrounding 400 m grid, slope percentage, historical LULC & aquifer context, bilingual verdict (`EN` / `हिंदी`), plinth/water/solar build scenarios, hazard notes, and 6 Indian real estate market facts.

---

## Project Architecture

Kalpa separates the Python FastAPI backend from the static frontend files so API logic and UI code stay modular and easy to maintain:

```text
kalpa-1/
├── backend/
│   ├── main.py          # FastAPI app, static file mount, /api/geocode, /api/reverse-geocode & /api/analyze
│   ├── terrain.py       # 9-point coordinate grid, elevation/slope scoring, state focus & hazard rules
│   ├── landuse.py       # Regional LULC history, groundwater/aquifer & soil classification
│   └── climate.py       # Rainwater harvesting, rooftop solar estimates & real estate market facts
├── frontend/
│   ├── index.html       # 8-section editorial landing layout, About modal & translucent analyzer panel
│   ├── styles.css       # Dark glass styling, scroll reveal animations, map container & scan-mode rules
│   └── app.js           # Three.js globe with quaternion zoom, Leaflet map view, tabs & API client
├── requirements.txt     # Python backend dependencies
├── .gitignore           # Ignored build, cache, environment, and OS files
└── README.md
