// Shared fetch wrapper that converts every failure mode into a typed ApiError.
export class ApiError extends Error {
  constructor(kind, message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind // offline | network | timeout | invalid-key | rate-limit | not-found | server | bad-response
    this.status = status
  }
}

export const ERROR_TEXT = {
  offline: 'You appear to be offline. Reconnect to load live weather.',
  network: 'Could not reach the weather service. Check your connection and try again.',
  timeout: 'The weather service took too long to respond.',
  'invalid-key': 'The weather API key was rejected (invalid or not yet activated).',
  'rate-limit': 'Weather API rate limit reached. Please wait a moment before retrying.',
  'not-found': 'No weather data was found for that location.',
  server: 'The weather service is having problems right now.',
  'bad-response': 'The weather service returned data we could not read.',
}

export async function getJson(url, { timeout = 12000, signal } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('offline', ERROR_TEXT.offline)
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  // An outside signal lets callers cancel requests that are no longer wanted (e.g. outdated autocomplete).
  if (signal) {
    if (signal.aborted) ctrl.abort()
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true })
  }
  let res
  try {
    res = await fetch(url, { signal: ctrl.signal })
  } catch (err) {
    if (err.name === 'AbortError') {
      if (signal?.aborted) throw new ApiError('aborted', 'Request cancelled')
      throw new ApiError('timeout', ERROR_TEXT.timeout)
    }
    throw new ApiError(navigator.onLine === false ? 'offline' : 'network', ERROR_TEXT.network)
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    const kind =
      res.status === 401 || res.status === 403 ? 'invalid-key'
        : res.status === 429 ? 'rate-limit'
          : res.status === 404 ? 'not-found'
            : 'server'
    throw new ApiError(kind, ERROR_TEXT[kind], res.status)
  }
  try {
    return await res.json()
  } catch {
    throw new ApiError('bad-response', ERROR_TEXT['bad-response'], res.status)
  }
}
