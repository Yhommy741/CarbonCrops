import { PHASE_LABEL } from '../format.js'

const W = 640
const DRY_LINE_CM = -15
const PHASE_FILL = {
  flooded: '#e0f2fe',
  reflood: '#e0f2fe',
  drying: '#fef3c7',
  final_drain: '#f5f5f4',
  no_data: '#fee2e2',
}

const time = (v) => new Date(v).getTime()
const shortDate = (t) => new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

/**
 * IoT water level over time. 0 = soil surface; below -15 cm the field should be refilled.
 * `phases` are the AWD phases the API detected from the same readings.
 */
export default function WaterChart({ series, phases = [], compact = false }) {
  const points = series.map((p) => ({ t: time(p.t), v: Number(p.level) }))
  if (points.length === 0) {
    return <p className="py-6 text-center text-sm text-stone-500">ยังไม่มีข้อมูลระดับน้ำจากเซ็นเซอร์</p>
  }

  const H = compact ? 72 : 220
  const pad = compact ? { l: 2, r: 2, t: 4, b: 4 } : { l: 40, r: 8, t: 12, b: 26 }
  // Phases end at a date; draw the last day through its end
  const phaseEnd = (ph) => (ph.end_date ? time(ph.end_date) + 86_400_000 : points[points.length - 1].t)

  let t0 = points[0].t
  let t1 = points[points.length - 1].t
  if (!compact) {
    for (const ph of phases) {
      t0 = Math.min(t0, time(ph.start_date))
      t1 = Math.max(t1, phaseEnd(ph))
    }
  }
  if (t1 === t0) t1 = t0 + 3_600_000
  const values = points.map((p) => p.v)
  const vMin = Math.min(-20, ...values)
  const vMax = Math.max(10, ...values)

  const x = (t) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r)
  const y = (v) => pad.t + ((vMax - v) / (vMax - vMin)) * (H - pad.t - pad.b)

  // Break the line where the sensor was offline for more than half a day
  let line = ''
  points.forEach((p, i) => {
    const jump = i === 0 || p.t - points[i - 1].t > 12 * 3_600_000
    line += `${jump ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`
  })
  const last = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="กราฟระดับน้ำในแปลงจากเซ็นเซอร์">
      {!compact &&
        phases.map((ph) => {
          const a = Math.max(x(time(ph.start_date)), pad.l)
          const b = Math.min(x(phaseEnd(ph)), W - pad.r)
          if (b <= a) return null
          return (
            <g key={ph.start_date}>
              <rect x={a} y={pad.t} width={b - a} height={H - pad.t - pad.b} fill={PHASE_FILL[ph.phase_type]} />
              {b - a > 50 && (
                <text x={a + 4} y={pad.t + 12} fontSize="11" fill="#78716c">
                  {PHASE_LABEL[ph.phase_type]}
                </text>
              )}
            </g>
          )
        })}

      {/* soil surface and AWD refill threshold */}
      <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#a8a29e" strokeDasharray="4 3" />
      <line x1={pad.l} x2={W - pad.r} y1={y(DRY_LINE_CM)} y2={y(DRY_LINE_CM)} stroke="#dc2626" strokeDasharray="4 3" strokeOpacity="0.6" />
      {!compact && (
        <g fontSize="11" fill="#78716c" textAnchor="end">
          <text x={pad.l - 6} y={y(0) + 4}>0</text>
          <text x={pad.l - 6} y={y(DRY_LINE_CM) + 4} fill="#dc2626">{DRY_LINE_CM}</text>
          <text x={pad.l - 6} y={y(vMax) + 4}>{Math.round(vMax)}</text>
          <text x={pad.l - 6} y={y(vMin) + 4}>{Math.round(vMin)}</text>
          <text x={pad.l} y={H - 8} textAnchor="start">{shortDate(t0)}</text>
          <text x={W - pad.r} y={H - 8}>{shortDate(t1)}</text>
        </g>
      )}

      <path d={line} fill="none" stroke="#0369a1" strokeWidth={compact ? 2 : 1.5} strokeLinejoin="round" />
      <circle cx={x(last.t)} cy={y(last.v)} r="4" fill="#0369a1" />
    </svg>
  )
}
