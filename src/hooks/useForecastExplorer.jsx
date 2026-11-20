import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchAirQuality } from '../services/weatherApi.js'
import { summarizeDay } from '../utils/forecastStats.js'
import { sameLocalDay } from '../utils/format.js'

const ForecastCtx = createContext(null)

function useNowSec() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** The hour to show when a day is first opened: the current hour today, otherwise the slot nearest midday. */
function defaultHour(day, hours, nowSec, isToday) {
  if (!hours.length) return null
  if (isToday) return hours.find((h) => h.dt <= nowSec && nowSec < h.dt + 3600) || hours[0]
  const noon = day.dt + 12 * 3600
  return hours.reduce((best, h) => (Math.abs(h.dt - noon) < Math.abs(best.dt - noon) ? h : best), hours[0])
}

/**
 * Shared state for the Forecast page: forecast data, selected day, selected hour,
 * selected chart metric and chart time range. Everything is derived from the one
 * forecast response already in memory, so switching days or charts never refetches.
 */
export function ForecastExplorerProvider({ data, units, h12, children }) {
  const nowSec = useNowSec()
  const days = useMemo(() => data.daily.slice(0, 7), [data.daily])
  const tzFor = useCallback((day) => day?.tzOffset ?? data.tzOffset, [data.tzOffset])
  const todayIndex = days.findIndex((d) => sameLocalDay(d.dt, nowSec, tzFor(d)))
  const locationKey = `${data.location.lat},${data.location.lon}`

  // Selections are stored by timestamp so a background refresh keeps the same day / hour selected.
  const [dayDt, setDayDt] = useState(null)
  const [hourDt, setHourDt] = useState(null)
  const [metric, setMetric] = useState('temp')
  const [range, setRange] = useState('day') // 'day' = hourly for the selected day, 'week' = daily across the forecast

  useEffect(() => { setDayDt(null); setHourDt(null) }, [locationKey])

  const found = days.findIndex((d) => d.dt === dayDt)
  const dayIndex = found >= 0 ? found : Math.max(0, todayIndex)
  const day = days[dayIndex] || null
  const isToday = dayIndex === todayIndex
  const hours = useMemo(() => day?.hours || [], [day])
  const hour = hours.find((h) => h.dt === hourDt) || (day ? defaultHour(day, hours, nowSec, isToday) : null)
  const summary = useMemo(() => summarizeDay(day), [day])

  const selectDay = useCallback((i) => {
    const d = days[i]
    if (!d) return
    setDayDt(d.dt)
    setHourDt(null)
  }, [days])

  // Selecting an hour that belongs to another day (e.g. stepping past midnight) moves the day selection too.
  const selectHour = useCallback((dt) => {
    const owner = days.find((d) => d.hours?.some((h) => h.dt === dt))
    if (!owner) return
    setDayDt(owner.dt)
    setHourDt(dt)
  }, [days])

  const allHours = useMemo(() => days.flatMap((d) => d.hours || []), [days])
  const stepHour = useCallback((delta) => {
    if (!hour) return
    const i = allHours.findIndex((h) => h.dt === hour.dt)
    const next = allHours[i + delta]
    if (next) selectHour(next.dt)
  }, [allHours, hour, selectHour])
  const hourPos = hour ? allHours.findIndex((h) => h.dt === hour.dt) : -1

  // Air quality is a separate (keyless) Open-Meteo endpoint, fetched once per location and cached.
  const [air, setAir] = useState({ status: 'loading', hours: [] })
  useEffect(() => {
    const ctrl = new AbortController()
    setAir({ status: 'loading', hours: [] })
    fetchAirQuality(data.location, { signal: ctrl.signal })
      .then((h) => setAir({ status: 'ready', hours: h }))
      .catch((err) => { if (err.kind !== 'aborted') setAir({ status: 'error', hours: [] }) })
    return () => ctrl.abort()
  }, [locationKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    data, units, h12, nowSec, tzFor,
    days, todayIndex, dayIndex, day, isToday, hours, hour, summary,
    selectDay, selectHour, stepHour,
    canStepBack: hourPos > 0, canStepForward: hourPos >= 0 && hourPos < allHours.length - 1,
    metric, setMetric, range, setRange,
    air,
  }
  return <ForecastCtx.Provider value={value}>{children}</ForecastCtx.Provider>
}

export function useForecastExplorer() {
  const ctx = useContext(ForecastCtx)
  if (!ctx) throw new Error('useForecastExplorer must be used inside <ForecastExplorerProvider>')
  return ctx
}
