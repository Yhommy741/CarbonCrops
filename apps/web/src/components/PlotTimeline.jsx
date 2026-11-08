import { useEffect, useRef, useState } from 'react'
import { apiImage, fileUrl, useApi } from '../api.js'
import { fmtDate, fmtNum } from '../format.js'
import { Empty, ErrorBox, Loading } from './ui.jsx'

const POLL_MS = 3000

/** Satellite image, loaded only when it scrolls into view. */
function SatelliteImage({ plotId, event, rootRef }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState({ status: 'idle' })

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), {
      root: rootRef.current,
      rootMargin: '0px 300px',
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [rootRef])

  useEffect(() => {
    if (!visible) return undefined
    let alive = true
    let url = null
    apiImage(`/plots/${plotId}/satellite/${event.date}/${event.layer}`)
      .then(async (res) => {
        if (!res.ok) return alive && setState({ status: 'error' })
        url = URL.createObjectURL(await res.blob())
        if (alive) setState({ status: 'ok', url })
      })
      .catch(() => alive && setState({ status: 'error' }))
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [visible, plotId, event.date, event.layer])

  return (
    <div ref={ref} className="relative aspect-square overflow-hidden rounded-xl bg-stone-100">
      {state.status === 'ok' && (
        <>
          <img src={state.url} alt={`ภาพดาวเทียม ${fmtDate(event.date)}`} className="h-full w-full object-cover" />
          {/* the plot is at the centre of the image */}
          <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-300 shadow" />
        </>
      )}
      {state.status === 'idle' && <div className="h-full w-full animate-pulse bg-stone-200" />}
      {state.status === 'error' && (
        <p className="flex h-full items-center justify-center p-3 text-center text-xs text-red-600">โหลดภาพไม่ได้</p>
      )}
    </div>
  )
}

const FARM_EVENT = {
  planting: { icon: '🌱', label: 'เริ่มปลูก', dot: 'bg-green-600', box: 'bg-green-50 text-green-800' },
  harvest: { icon: '🌾', label: 'เก็บเกี่ยว', dot: 'bg-amber-500', box: 'bg-amber-50 text-amber-800' },
}

// Card width (w-40) + gap (gap-4): the distance from one card's centre to the next
const STEP_PX = 176
const WATER_H = 96
const DRY_LINE_CM = -15
const MAX_GAP_MS = 12 * 3_600_000 // sensor offline longer than this = break in the line

/** Where on the timeline a card sits: midday of its date. */
const eventTime = (event) => new Date(`${event.date}T12:00:00`).getTime()

/** Index of the first point with t >= time. */
function firstAtOrAfter(points, time) {
  let lo = 0
  let hi = points.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].t < time) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** Water level at `time`, interpolated between the two nearest readings; null if the sensor was offline. */
function levelAt(points, time) {
  const i = firstAtOrAfter(points, time)
  const a = points[i - 1]
  const b = points[i]
  if (b && b.t === time) return b.v
  if (!a || !b || b.t - a.t > MAX_GAP_MS) return null
  return a.v + ((b.v - a.v) * (time - a.t)) / (b.t - a.t)
}

/** Water level line from this card's centre to the next card's centre. */
function WaterSegment({ points, t0, t1, y }) {
  let path = ''
  if (t1 === t0) {
    // two cards on the same day: keep the line flat between them
    const v = levelAt(points, t0)
    if (v !== null) path = `M0,${y(v)}H${STEP_PX}`
  } else {
    // one reading either side of the range, so the line runs to the edges (the svg clips it)
    const from = Math.max(0, firstAtOrAfter(points, t0) - 1)
    const to = Math.min(points.length, firstAtOrAfter(points, t1) + 1)
    const x = (t) => ((t - t0) / (t1 - t0)) * STEP_PX
    for (let i = from; i < to; i++) {
      const jump = i === from || points[i].t - points[i - 1].t > MAX_GAP_MS
      path += `${jump ? 'M' : 'L'}${x(points[i].t).toFixed(1)},${y(points[i].v).toFixed(1)}`
    }
  }
  if (!path) return null
  return (
    <svg width={STEP_PX} height={WATER_H} className="absolute left-1/2 top-0" aria-hidden>
      <path d={path} fill="none" stroke="#0284c7" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function TimelineItem({ plotId, event, rootRef, water }) {
  const farm = FARM_EVENT[event.kind]
  return (
    <li className="relative w-40 shrink-0 snap-end pt-6">
      <span
        className={`absolute left-1/2 top-[13px] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white ${farm ? farm.dot : 'bg-sky-600'}`}
      />
      {farm ? (
        <div className={`flex aspect-square items-center justify-center overflow-hidden rounded-xl ${farm.box}`}>
          {event.photo ? (
            <img src={fileUrl(event.photo)} alt={`${farm.label} ${event.cycle_name}`} className="h-full w-full object-cover" />
          ) : (
            <span className="text-5xl">{farm.icon}</span>
          )}
        </div>
      ) : (
        <SatelliteImage plotId={plotId} event={event} rootRef={rootRef} />
      )}
      {/* fixed height so the water row lines up across all cards */}
      <div className="h-16 overflow-hidden">
        <p className="mt-2 text-sm font-medium">{fmtDate(event.date)}</p>
        <p className="text-xs text-stone-500">
          {farm ? (
            <>
              {farm.icon} {farm.label} · {event.cycle_name}
              {event.kind === 'planting' && event.rice_variety && <span className="block">{event.rice_variety}</span>}
            </>
          ) : (
            <>🛰️ {event.source}</>
          )}
        </p>
      </div>
      {water && (
        <div className="relative" style={{ height: WATER_H }}>
          {water.next !== null && <WaterSegment points={water.points} t0={water.t} t1={water.next} y={water.y} />}
          {water.level !== null && (
            <>
              <span
                className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-700"
                style={{ top: water.y(water.level) }}
              />
              <span
                className="absolute left-1/2 -translate-x-1/2 rounded bg-white/85 px-1 text-[11px] font-medium text-sky-800"
                style={{ top: Math.max(0, water.y(water.level) - 22) }}
              >
                {fmtNum(water.level, 1)} ซม.
              </span>
            </>
          )}
        </div>
      )}
    </li>
  )
}

/** Horizontal timeline: planting, harvest and the days a satellite really photographed the plot. */
export default function PlotTimeline({ plotId }) {
  const { data, error, reload } = useApi(`/plots/${plotId}/timeline`)
  const scrollRef = useRef(null)
  const scrolled = useRef(false)
  const scanning = Boolean(data?.scan)

  // While the backend is still searching for satellite days, refresh every few seconds
  useEffect(() => {
    if (!scanning) return undefined
    const id = setInterval(reload, POLL_MS)
    return () => clearInterval(id)
  }, [scanning, reload])

  // Start at the newest event, once
  useEffect(() => {
    const el = scrollRef.current
    if (el && data?.events.length && !scrolled.current) {
      el.scrollLeft = el.scrollWidth
      scrolled.current = true
    }
  }, [data])

  if (error && !data) return <ErrorBox error={error} />
  if (!data) return <Loading />

  const satelliteCount = data.events.filter((e) => e.kind === 'satellite').length

  // Water level row: one shared vertical scale so the segments join into one line
  const points = data.water.map((p) => ({ t: new Date(p.t).getTime(), v: p.level }))
  const hasWater = points.length > 0
  let vMin = -20
  let vMax = 10
  for (const p of points) {
    vMin = Math.min(vMin, p.v)
    vMax = Math.max(vMax, p.v)
  }
  const y = (v) => 8 + ((vMax - v) / (vMax - vMin)) * (WATER_H - 16)
  const times = data.events.map(eventTime)
  const waterFor = (i) => ({
    points,
    y,
    t: times[i],
    next: i + 1 < times.length ? times[i + 1] : null,
    level: levelAt(points, times[i]),
  })

  return (
    <div>
      {!data.has_location && <p className="mb-3 text-xs text-amber-700">แปลงนี้ยังไม่มีพิกัด GPS จึงค้นหาภาพดาวเทียมไม่ได้</p>}
      {scanning && (
        <div className="mb-3">
          <p className="text-xs text-stone-600">
            กำลังค้นหาวันที่ดาวเทียมถ่ายภาพแปลงนี้… {fmtNum((data.scan.done / data.scan.total) * 100, 0)}%
            (ครั้งแรกใช้เวลาสักครู่ ครั้งต่อไปจะขึ้นทันที)
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full bg-sky-600 transition-all" style={{ width: `${(data.scan.done / data.scan.total) * 100}%` }} />
          </div>
        </div>
      )}
      {!scanning && data.has_location && (
        <p className="mb-3 text-xs text-stone-500">พบภาพดาวเทียม {satelliteCount} วัน · เลื่อนซ้ายเพื่อดูย้อนหลัง</p>
      )}
      {data.events.length > 0 && (
        <p className="mb-3 text-xs text-stone-500">
          {hasWater ? (
            <>
              💧 แถบล่าง = ระดับน้ำจากเซ็นเซอร์ ระหว่างแต่ละภาพ · <span className="text-stone-700">เส้นเทา</span> = ผิวดิน (0 ซม.) ·{' '}
              <span className="text-amber-700">เส้นประส้ม</span> = {DRY_LINE_CM} ซม. ควรเติมน้ำ
            </>
          ) : (
            'ยังไม่มีข้อมูลระดับน้ำจากเซ็นเซอร์ในช่วงนี้'
          )}
        </p>
      )}
      {data.events.length === 0 ? (
        <Empty>ยังไม่มีข้อมูล</Empty>
      ) : (
        <div ref={scrollRef} className="-mx-4 snap-x overflow-x-auto px-4 pb-2">
          <div className="relative w-max">
            <span aria-hidden className="absolute left-0 right-0 top-[18px] h-0.5 bg-stone-200" />
            {hasWater && (
              // background band of the water row, with the soil surface and refill lines
              <div aria-hidden className="absolute bottom-0 left-0 right-0 rounded-lg bg-sky-50" style={{ height: WATER_H }}>
                <span className="absolute left-0 right-0 border-t border-stone-400" style={{ top: y(0) }} />
                <span className="absolute left-0 right-0 border-t border-dashed border-amber-500" style={{ top: y(DRY_LINE_CM) }} />
              </div>
            )}
            <ol className="flex gap-4">
              {data.events.map((event, i) => (
                <TimelineItem
                  key={`${event.kind}-${event.date}-${event.layer ?? event.cycle_id}`}
                  plotId={plotId}
                  event={event}
                  rootRef={scrollRef}
                  water={hasWater ? waterFor(i) : null}
                />
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
