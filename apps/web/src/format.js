// Text labels live in locales/*.js and number/date formatting in preferences.jsx (usePreferences).

// Common Thai rice fertilizer formulas (N-P-K)
export const FERTILIZER_FORMULAS = ['16-20-0', '46-0-0', '15-15-15', '16-16-8', '16-8-8', '21-0-0']

/** Today as YYYY-MM-DD in local time (for <input type="date">). */
export function todayISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
