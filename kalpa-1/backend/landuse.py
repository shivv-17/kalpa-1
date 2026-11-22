def classify_indian_terrain(lat: float, lng: float):
    if lat > 28.5:
        is_himalayan = lat > 30.2 or (74.0 <= lng <= 97.5 and lat > 29.5)
        return {
            "historical_lulc": (
                "Montane / Foothill Slope & Valley Corridor (Bhuvan LULC)"
                if is_himalayan
                else "Foothill Alluvium / Agricultural Plain (Bhuvan LULC)"
            ),
            "groundwater": (
                "Spring & Fractured Bedrock / Valley Alluvium (25–80m)"
                if is_himalayan
                else "High Yield — Indo-Gangetic Alluvial Aquifer (40–85m)"
            ),
            "soil": (
                "Mountain Forest / Gravelly Loam"
                if is_himalayan
                else "Alluvial Loam & Piedmont Sediment"
            ),
            "bhujal_score": 78 if is_himalayan else 86,
            "waterbody_score": 76 if is_himalayan else 82,
        }
    elif 20.0 <= lat <= 28.5:
        is_coastal = lng < 73.2 or lng > 86.5
        return {
            "historical_lulc": (
                "Coastal Deltaic / Estuarine Fringe (Bhuvan LULC)"
                if is_coastal
                else "Elevated Plateau / Cropland Scrub (Bhuvan LULC)"
            ),
            "groundwater": (
                "Alluvial / Coastal Aquifer — Salinity Check Advised (20–90m)"
                if is_coastal
                else "Moderate Yield — Deccan Basalt / Vindhyan Aquifer (95–150m)"
            ),
            "soil": (
                "Coastal Alluvial / Sandy Clay"
                if is_coastal
                else "Black Cotton / Murum Sub-base"
            ),
            "bhujal_score": 68 if is_coastal else 75,
            "waterbody_score": 72 if is_coastal else 86,
        }
    else:
        is_ghats_or_coast = (74.0 <= lng <= 77.5 and 8.0 <= lat <= 19.5) or lng > 79.8
        return {
            "historical_lulc": (
                "Peninsular Ghat / Tank-Irrigated Belt (Bhuvan LULC)"
                if is_ghats_or_coast
                else "Peninsular Plateau / Scrub & Dryland (Bhuvan LULC)"
            ),
            "groundwater": "Moderate-Low — Crystalline Archean / Weathered Rock (140–240m)",
            "soil": "Red Lateritic / Sandy Clay",
            "bhujal_score": 62,
            "waterbody_score": 74,
        }