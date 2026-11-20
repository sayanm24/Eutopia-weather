# EUTOPIA

**Experience the weather, don't just forecast it.** A live-adaptive weather app whose whole environment —
sky, clouds, particles, lighting, palette and music — follows the real conditions outside.

## Run it

```bash
npm install
cp .env.example .env      # then add your OpenWeather key
npm run dev               # http://localhost:5173
```

Production: `npm run build && npm start` (serves `dist/` and the API proxy on port 8787).

## API keys & security

`OPENWEATHER_API_KEY` is read only by the proxy (`server/routes.js`, used by both the Vite dev server and
`server/index.js`). The browser calls `/api/ow/...` and the key is appended server-side, so it never appears in the
frontend bundle. `.env` is git-ignored. Do not rename the variable with a `VITE_` prefix.

## Data sources

| Data | Source |
| --- | --- |
| Everything below, when `WEATHERAPI_KEY` is set | WeatherAPI.com becomes the primary provider (search, current, forecast) |
| Place search / autocomplete | Open-Meteo geocoding, then OpenWeather geocoding |
| Current conditions | OpenWeather (falls back to Open-Meteo if the key is rejected, rate-limited or unreachable) |
| Hourly, 7-day forecast, UV index | Open-Meteo (keyless; OpenWeather's free plan does not include these) |
| Air quality (Forecast page) | Open-Meteo Air Quality API (keyless, ~5 days ahead; cached 30 min) |
| Weather alerts, moon phase / rise / set | WeatherAPI.com only. Without it, alerts show as "not provided" and the moon phase is an astronomical calculation, labelled as such |
| Radar | RainViewer public API on OpenStreetMap tiles |
| Music search, artwork, 30 s previews | iTunes Search API; tracks and mixes link out to Spotify |

Nothing is synthesised: when a source fails the UI shows an error, a stale-data banner, or an "unavailable" state.

## Structure

```
server/            proxy routes + production server
src/engines/       weatherClassifier, weatherThemeEngine, animationEngine, layers/ (sky, clouds, rain, snow, fog, lightning, landscape)
src/themes/        scene + palette + music mood per environment
src/services/      openWeatherApi, openMeteoApi, weatherApi (aggregator), rainViewerApi, musicApi
src/hooks/         useWeather, useLocation, useSettings, usePlayer
src/components/    WeatherDashboard, WeatherAnimations, WeatherCards, HourlyForecast, WeeklyForecast,
                   MusicPlayer, WeatherRadar, LocationSearch, Navigation, Settings,
                   Forecast/ (interactive Forecast page, see below)
```

## Forecast page

Each section follows one shared selection held in `src/hooks/useForecastExplorer.jsx`. That state covers the
selected day, the selected hour, the chart metric and the chart range (hourly for the selected day, or the full
7 days). All of it is derived from the single forecast response already in memory, so switching days, hours or
charts never triggers a new request.

| Section | Component(s) |
| --- | --- |
| Header (place, local date, the selected day's sunrise / sunset / rain / range) | `ForecastHeader` |
| 12 live metric cards; clicking a card opens that metric's graph and stats | `WeatherMetricsGrid`, `WeatherMetricCard` |
| Hourly timeline for the selected day; clicking an hour opens all its measurements | `HourlyForecastTimeline`, `HourlyDetailPanel` |
| Seven selectable days and the temperature range chart | `SevenDayForecast`, `ForecastDayCard`, `TemperatureRangeChart` |
| Selected day: summary, rain, wind compass, humidity, atmosphere, sun & UV, moon, alerts, air quality | `SelectedDayDetails` |
| Weather insights: metric tabs, hourly / 7-day toggle, highlighted extremes, data table | `WeatherInsights`, `InteractiveWeatherChart` and its wrappers (`TemperatureChart`, `HumidityChart`, `PressureChart`, `WindChart`, `PrecipitationChart`, `UVChart`, `VisibilityChart`) |
| Sound of the sky: today follows the live sky; other days follow their forecast | `SoundOfTheSky` |

Chart definitions (series, units, domains, highlights) live in `Forecast/chartSpecs.js`. Measures in different
units are never put on two y-axes: each gets its own panel on a shared time axis (rain chance vs amount,
visibility vs cloud cover). A value the provider doesn't supply is drawn as a gap and labelled "not available".
Each day's hours are grouped by that day's own UTC offset, so the week stays correct across daylight-saving
changes. The page and its chart library (Recharts) are lazy-loaded.

## Simulation mode

Settings → Simulation mode previews any environment (day or night) over the real readings. A "Simulated" banner stays
visible while it is active, and it resets to live weather on reload.

## Location search

The search bar in the top bar autocompletes worldwide places (debounced 300 ms, outdated requests are cancelled,
suggestions are cached). It accepts names, "City, Country" and coordinates such as `22.57, 88.36`. Arrow keys and
Enter work; the target icon beside it uses device location. Star a place in the hero to add it to favourites.
