import math


def get_surrounding_coords(lat: float, lng: float, radius_m: float = 400.0):
    d_lat = radius_m / 111320.0
    cos_lat = max(math.cos(math.radians(lat)), 0.1)
    d_lng = radius_m / (111320.0 * cos_lat)
    diag_lat = d_lat * 0.7071
    diag_lng = d_lng * 0.7071

    return [
        ("Center", lat, lng),
        ("N", lat + d_lat, lng),
        ("NE", lat + diag_lat, lng + diag_lng),
        ("E", lat, lng + d_lng),
        ("SE", lat - diag_lat, lng + diag_lng),
        ("S", lat - d_lat, lng),
        ("SW", lat - diag_lat, lng - diag_lng),
        ("W", lat, lng - d_lng),
        ("NW", lat + diag_lat, lng - diag_lng),
    ]


def infer_indian_state_focus(lat: float, lng: float):
    states = [
        ("Madhya Pradesh", 23.47, 77.94),
        ("Uttar Pradesh", 26.85, 80.95),
        ("Maharashtra", 19.75, 75.71),
        ("Rajasthan", 26.91, 73.85),
        ("Gujarat", 22.30, 71.19),
        ("Karnataka", 14.52, 75.72),
        ("Tamil Nadu", 11.12, 78.65),
        ("Telangana & Andhra", 17.38, 79.01),
        ("West Bengal & Odisha", 22.25, 86.40),
        ("Bihar & Jharkhand", 24.80, 85.40),
        ("Delhi NCR & Haryana", 28.70, 77.10),
        ("Punjab & Himachal", 31.10, 76.50),
        ("Uttarakhand", 30.06, 79.01),
        ("Kerala", 10.35, 76.40),
        ("Northeast India", 25.80, 92.90),
    ]
    best_name, best_lat, best_lng = states[0]
    best_dist = float("inf")
    for name, s_lat, s_lng in states:
        dist = (lat - s_lat) ** 2 + (lng - s_lng) ** 2
        if dist < best_dist:
            best_dist = dist
            best_name, best_lat, best_lng = name, s_lat, s_lng
    return {"region": best_name, "focus_lat": best_lat, "focus_lng": best_lng}


def evaluate_elevation_metrics(elevations: list[float]):
    if not elevations or len(elevations) < 9:
        elevations = [100.0] * 9

    center_elev = float(elevations[0])
    surrounding = [float(x) for x in elevations[1:]]
    avg_surrounding = sum(surrounding) / len(surrounding)
    rel_elevation = round(center_elev - avg_surrounding, 2)
    relief_range = round(max(surrounding) - min(surrounding), 2)
    slope_pct = round((relief_range / 800.0) * 100, 2)

    if rel_elevation < -2.0:
        elev_score = 32
        drainage_status = "Low-Lying Basin (Waterlogging Prone)"
    elif rel_elevation < -0.6:
        elev_score = 58
        drainage_status = "Mild Depression (Needs Raised Plinth)"
    elif slope_pct > 12.0:
        elev_score = 60
        drainage_status = "Steep Gradient (Runoff Management Needed)"
    else:
        elev_score = 91
        drainage_status = "Elevated & Naturally Well-Drained"

    return {
        "center_elev": center_elev,
        "rel_elevation": rel_elevation,
        "slope_pct": slope_pct,
        "elev_score": elev_score,
        "drainage_status": drainage_status,
    }


def assess_natural_hazards(lat: float, lng: float, rel_elevation: float, slope_pct: float, rain_7d_mm: float):
    if rel_elevation < -2.0 or (rel_elevation < -0.8 and rain_7d_mm > 60):
        flood_level = "Elevated"
        flood_detail = "Low basin profile relative to surrounding terrain increases monsoon waterlogging sensitivity."
    elif rel_elevation < -0.6 or rain_7d_mm > 80:
        flood_level = "Moderate"
        flood_detail = "Slight depression or heavy rainfall window requires raised plinth and clear storm drainage."
    else:
        flood_level = "Low"
        flood_detail = "Site sits above or level with immediate 400m surroundings with natural runoff potential."

    hilly_zone = (
        (lat > 28.8 and 74.0 <= lng <= 97.5)
        or (22.0 <= lat <= 28.5 and lng > 89.5)
        or (8.0 <= lat <= 19.5 and 74.2 <= lng <= 77.4)
    )
    if slope_pct > 12.0 or (hilly_zone and slope_pct > 5.0):
        landslide_level = "Elevated"
        landslide_detail = "Steeper terrain gradient or hilly/ghat belt calls for slope stability and retaining-wall checks."
    elif hilly_zone or slope_pct > 4.0:
        landslide_level = "Moderate"
        landslide_detail = "Moderate relief or foothill/ghat proximity; verify cut-slope drainage during heavy rain."
    else:
        landslide_level = "Low"
        landslide_detail = "Gentle gradient outside high-relief landslide belts."

    high_seismic = (
        (lat > 26.5 and 74.0 <= lng <= 97.0)
        or (22.5 <= lat <= 24.5 and 68.5 <= lng <= 71.5)
        or (21.5 <= lat <= 26.5 and lng > 88.5)
    )
    cyclone_belt = (lng < 73.5 or lng > 79.8) and lat < 23.0

    if high_seismic and cyclone_belt:
        regional_tag = "Seismic & Cyclone Belt"
        regional_detail = "Regional context includes active seismic and coastal wind/rain exposure; build to IS codes."
    elif high_seismic:
        regional_tag = "Higher Seismic Zone"
        regional_detail = "Located near a higher-activity seismic belt; ensure compliant structural framing."
    elif cyclone_belt:
        regional_tag = "Coastal / Cyclone Belt"
        regional_detail = "Coastal margin experiences seasonal cyclonic wind and surge/rain influence."
    else:
        regional_tag = "Interior Plateau / Plains"
        regional_detail = "Lower cyclone exposure than coasts; focus on storm drainage and seasonal heat/monsoon design."

    return {
        "flood": {"level": flood_level, "detail": flood_detail},
        "landslide": {"level": landslide_level, "detail": landslide_detail},
        "regional": {"tag": regional_tag, "detail": regional_detail},
    }