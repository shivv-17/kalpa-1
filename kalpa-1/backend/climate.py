def compute_climate_yield(weather_data: dict, plot_area_sqm: float):
    rain_list = [x for x in weather_data.get("precipitation_sum", []) if x is not None]
    rain_7d_mm = round(sum(rain_list), 1) if rain_list else 0.0

    solar_list = [x for x in weather_data.get("shortwave_radiation_sum", []) if x is not None]
    solar_kwh_m2 = round((sum(solar_list) / len(solar_list)) * 0.2778, 2) if solar_list else 5.0

    area_sqm = max(20.0, min(plot_area_sqm, 50000.0))
    usable_roof_factor = min(area_sqm * 0.35, 120.0)
    est_solar_daily_kwh = round((solar_kwh_m2 * usable_roof_factor * 0.18) / 10.0, 1)
    annual_rainwater_liters = int(area_sqm * 0.75 * 920 * 0.80)
    climate_score = min(95, max(45, int(65 + (solar_kwh_m2 * 4))))

    return {
        "area_sqm": area_sqm,
        "rain_7d_mm": rain_7d_mm,
        "est_solar_daily_kwh": est_solar_daily_kwh,
        "annual_rainwater_liters": annual_rainwater_liters,
        "climate_score": climate_score,
    }


def get_market_facts():
    return [
        {
            "title": "Steady Residential & Tier-2 Momentum",
            "detail": "Indian housing values have continued gradual upward growth in 2026, with strong end-user demand across both major metros and fast-growing Tier-2 cities.",
        },
        {
            "title": "Shift Toward Spacious Homes & Plotted Corridors",
            "detail": "Buyers increasingly favor larger floor plates, gated plotted layouts, and emerging highway/metro corridors where entry pricing is more flexible than dense cores.",
        },
        {
            "title": "Infrastructure-Led Micro-Market Re-Rating",
            "detail": "Locations near upcoming expressways, metro extensions, and employment hubs attract sharper buyer interest—though finished infrastructure matters more than announcements.",
        },
        {
            "title": "Green & Water-Resilient Features Add Resale Value",
            "detail": "Plots and homes built with rainwater harvesting, solar readiness, and proper storm drainage avoid monsoon damage and command stronger long-term buyer confidence.",
        },
        {
            "title": "RERA, Title & Layout Discipline",
            "detail": "With buyers prioritizing credible developers and clear paperwork, verifying RERA registration, sanctioned layout plans, and encumbrance-free titles prevents costly delays.",
        },
        {
            "title": "Medium-to-Long-Term Holding Horizon",
            "detail": "Because stamp duty, registration, and site-development expenses add upfront cost, Indian land purchases reward 4–7+ year holding horizons over short-term flipping.",
        },
    ]