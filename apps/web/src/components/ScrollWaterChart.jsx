import { useLayoutEffect, useState } from 'react'
import { usePreferences } from '../preferences.jsx'

const DAY = 86_400_000
const WINDOW = 7 * DAY // one screen = one week
const H = 180
const PAD = { t: 10, b: 22 }
const AXIS_W = 34
const DRY_LINE_CM = -15
const MUTED = 'var(--color-stone-500)'
const GRID = 'var(--color-stone-200)'
const LINE = 'var(--color-sky-700)'
const DANGER = 'var(--color-red-600)'

/** Width of the element (0 until it is rendered), kept up to date as it resizes. */
function useWidth(el) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!el) return undefined
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return width
}

/**
 * Water level with a one-week window that scrolls sideways through older readings.
 * Opens on the latest week. 0 = soil surface; at -15 cm the field should be refilled.
 */
export default function ScrollWaterChart({ series }) {
  const { t, fmt } = usePreferences()
  const [scrollEl, setScrollEl] = useState(null) // callback ref: set when the chart first renders
  const width = useWidth(scrollEl)
  const points = series.map((p) => ({ t: new Date(p.t).getTime(), v: Number(p.level) }))

  const t1 = points.length ? points[points.length - 1].t : 0
  const t0 = points.length ? Math.min(points[0].t, t1 - WINDOW) : 0
  const innerW = width ? Math.max(width, Math.round((width * (t1 - t0)) / WINDOW)) : 0
  const scrolls = innerW > width

  // Start at the latest readings (the right end); again when new data makes it wider
  useLayoutEffect(() => {
    if (scrollEl) scrollEl.scrollLeft = scrollEl.scrollWidth
  }, [scrollEl, innerW])

  if (points.length === 0) {
    return <p className="py-6 text-center text-sm text-stone-500">{t('water.chartEmpty')}</p>
  }

  const values = points.map((p) => p.v)
  const vMin = Math.min(-20, ...values)
  const vMax = Math.max(10, ...values)
  const y = (v) => PAD.t + ((vMax - v) / (vMax - vMin)) * (H - PAD.t - PAD.b)
  const x = (tm) => ((tm - t0) / (t1 - t0)) * (innerW - 8) + 4

  // Break the line where the sensor was offline for more than half a day
  let line = ''
  points.forEach((p, i) => {
    const jump = i === 0 || p.t - points[i - 1].t > DAY / 2
    line += `${jump ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`
  })

  // A grid line and label at each local midnight
  const days = []
  const d = new Date(t0)
  d.setHours(24, 0, 0, 0)
  for (; d.getTime() <= t1; d.setDate(d.getDate() + 1)) days.push(d.getTime())
  const last = points[points.length - 1]

  return (
    <div>
      <div className="flex">
        <svg width={AXIS_W} height={H} className="shrink-0" aria-hidden="true">
          <g fontSize="11" fill={MUTED} textAnchor="end">
            <text x={AXIS_W - 4} y={y(vMax) + 4}>{Math.round(vMax)}</text>
            <text x={AXIS_W - 4} y={y(0) + 4}>0</text>
            <text x={AXIS_W - 4} y={y(DRY_LINE_CM) + 4} fill={DANGER}>{DRY_LINE_CM}</text>
            <text x={AXIS_W - 4} y={y(vMin) + 4}>{Math.round(vMin)}</text>
          </g>
        </svg>
        <div ref={setScrollEl} className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
          {innerW > 0 && (
            <svg width={innerW} height={H} role="img" aria-label={t('water.chartLabel')} className="block">
              {days.map((day) => (
                <g key={day}>
                  <line x1={x(day)} x2={x(day)} y1={PAD.t} y2={H - PAD.b} stroke={GRID} />
                  <text x={x(day) + 3} y={H - 6} fontSize="11" fill={MUTED}>
                    {fmt.shortDate(day)}
                  </text>
                </g>
              ))}
              <line x1={0} x2={innerW} y1={y(0)} y2={y(0)} stroke="var(--color-stone-400)" strokeDasharray="4 3" />
              <line x1={0} x2={innerW} y1={y(DRY_LINE_CM)} y2={y(DRY_LINE_CM)} stroke={DANGER} strokeDasharray="4 3" strokeOpacity="0.6" />
              <path d={line} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
              <circle cx={x(last.t)} cy={y(last.v)} r="4" fill={LINE} />
            </svg>
          )}
        </div>
      </div>
      {scrolls && <p className="mt-1 text-right text-xs text-stone-400">{t('dashboard.scrollHint')}</p>}
    </div>
  )
}
