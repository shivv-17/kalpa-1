# Kalpa

Kalpa is a spatial site-readiness and terrain advisor built for Indian plot buyers, homebuilders, and residents. It combines a 3D interactive globe, 9-point elevation and drainage analysis, natural hazard context, rainwater and solar yield estimates, and Indian real estate purchasing insights.

## Project Structure

```text
kalpa/
├── backend/
│   ├── main.py          # FastAPI server, geocoding, and /api/analyze endpoint
│   ├── terrain.py       # 9-point elevation grid, slope, state focus, and hazards
│   ├── landuse.py       # Regional LULC, groundwater/aquifer, and soil framing
│   └── climate.py       # Rainwater harvesting, solar potential, and market facts
├── frontend/
│   ├── index.html       # 8-section landing narrative and translucent scan panel
│   ├── styles.css       # Glassmorphism, animations, and layout styling
│   └── app.js           # Three.js globe zoom, Leaflet map, and scan UI logic
├── requirements.txt
├── .gitignore
└── README.md
