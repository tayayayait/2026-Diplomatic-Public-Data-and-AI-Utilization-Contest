# Weather Forecast

Phase 4 adds an Open-Meteo integration for pre-departure weather risk. The dashboard
and `/weather` detail page must render this API result, not generated sample weather.

## Scope

The dashboard can show destination weather risk for the travel date range:

- Daily weather condition
- Minimum and maximum temperature
- Maximum precipitation probability
- Daily precipitation sum
- Maximum wind speed
- Maximum UV index

The app uses the first city in the destination. If no city exists, it uses a known
major city for the selected country. Korean display city names such as `교토` are
converted to API-searchable aliases such as `Kyoto` before geocoding, while the UI
keeps the Korean display name.

## API

Geocoding:

```text
GET https://geocoding-api.open-meteo.com/v1/search
```

Forecast:

```text
GET https://api.open-meteo.com/v1/forecast
```

The forecast request uses `daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max`, `timezone=auto`, and `forecast_days=16`.

## Forecast Limits

Open-Meteo forecast availability depends on weather model coverage. The app treats missing travel dates as `partial` or `out_of_range` and tells the user to recheck closer to departure. It does not fabricate long-range weather forecasts.

## Files

- `src/lib/diplolife/api/weather.ts`
- `src/lib/diplolife/state.ts`
- `src/components/diplolife/cards/WeatherCard.tsx`
- `src/routes/weather.tsx`
