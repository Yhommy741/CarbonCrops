import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api, getPosition, useApi } from '../api.js'
import PlotTimeline from '../components/PlotTimeline.jsx'
import { Badge, Button, Card, Empty, ErrorBox, Field, inputClass, Loading, PageTitle } from '../components/ui.jsx'
import { CYCLE_STATUS, fmtDate, fmtDateTime, fmtNum, todayISO } from '../format.js'

const CYCLE_COLOR = { planned: 'stone', active: 'green', harvested: 'amber', closed: 'stone' }

function NewCycleForm({ plotId }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ cycle_name: '', rice_variety: '', start_date: todayISO() })
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      for (const [key, value] of Object.entries(form)) if (value) body.append(key, value)
      body.append('photo', photo)
      body.append('captured_at', new Date().toISOString().slice(0, 19))
      const pos = await getPosition()
      if (pos) {
        body.append('latitude', pos.latitude.toFixed(6))
        body.append('longitude', pos.longitude.toFixed(6))
      }
      const { cycle_id } = await api(`/plots/${plotId}/cycles`, { method: 'POST', form: body })
      navigate(`/cycles/${cycle_id}`)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="ชื่อรอบ">
          <input required value={form.cycle_name} onChange={set('cycle_name')} className={inputClass} placeholder="นาปี 2569" />
        </Field>
        <Field label="พันธุ์ข้าว">
          <input value={form.rice_variety} onChange={set('rice_variety')} className={inputClass} placeholder="กข43" />
        </Field>
        <Field label="วันเริ่มปลูก">
          <input required type="date" max={todayISO()} value={form.start_date} onChange={set('start_date')} className={inputClass} />
        </Field>
      </div>
      <Field label="รูปถ่ายแปลงวันเริ่มปลูก" hint="ถ่ายที่แปลง ระบบจะบันทึกพิกัด GPS เป็นหลักฐานว่าเริ่มรอบนี้จริง">
        <input required type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files[0] ?? null)} className="block w-full text-sm" />
      </Field>
      <ErrorBox error={error} />
      <Button type="submit" disabled={busy || !photo}>
        {busy ? 'กำลังบันทึก…' : 'เริ่มรอบการปลูก'}
      </Button>
    </form>
  )
}

export default function PlotDetail() {
  const { plotId } = useParams()
  const { data: plot, error, loading } = useApi(`/plots/${plotId}`)
  const [showNewCycle, setShowNewCycle] = useState(false)

  if (loading) return <Loading />
  if (error) return <ErrorBox error={error} />
  const hasActive = plot.cycles.some((c) => c.status === 'active')

  return (
    <div className="space-y-4">
      <PageTitle
        title={plot.plot_name}
        subtitle={`${fmtNum(plot.area_rai)} ไร่ · ${[plot.subdistrict, plot.district, plot.province].filter(Boolean).join(', ')}`}
      />

      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-stone-500">เจ้าของ</dt>
            <dd>{plot.owner_name}</dd>
          </div>
          <div>
            <dt className="text-stone-500">เอกสารสิทธิ์</dt>
            <dd>{plot.land_doc_no || '-'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-stone-500">พิกัด GPS</dt>
            <dd>
              {plot.latitude ? (
                <a
                  className="text-green-800 underline"
                  href={`https://www.google.com/maps?q=${plot.latitude},${plot.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {plot.latitude}, {plot.longitude}
                </a>
              ) : (
                '-'
              )}
            </dd>
          </div>
        </dl>
        {plot.latitude && (
          <iframe
            title={`แผนที่ ${plot.plot_name}`}
            src={`https://maps.google.com/maps?q=${plot.latitude},${plot.longitude}&t=k&z=17&output=embed`}
            className="mt-3 h-64 w-full rounded-xl border-0 sm:h-80"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">รอบการปลูก</h2>
            <p className="text-xs text-stone-500">ทำนาไปแล้ว {plot.completed_cycles} รอบ</p>
          </div>
          {plot.can_edit && !showNewCycle && !hasActive && (
            <Button variant="secondary" onClick={() => setShowNewCycle(true)}>
              + รอบใหม่
            </Button>
          )}
        </div>
        {showNewCycle && (
          <div className="mb-4 rounded-xl bg-stone-50 p-3">
            <NewCycleForm plotId={plotId} />
          </div>
        )}
        {plot.cycles.length === 0 && <Empty>ยังไม่มีรอบการปลูก</Empty>}
        <ul className="divide-y divide-stone-100">
          {plot.cycles.map((c) => (
            <li key={c.cycle_id}>
              <Link to={`/cycles/${c.cycle_id}`} className="flex items-center justify-between py-3 hover:text-green-800">
                <span>
                  <span className="block font-medium">{c.cycle_name}</span>
                  <span className="text-xs text-stone-500">
                    {c.rice_variety} · {fmtDate(c.start_date)} – {c.end_date ? fmtDate(c.end_date) : 'ปัจจุบัน'}
                  </span>
                </span>
                <span className="text-right">
                  <Badge color={CYCLE_COLOR[c.status]}>{CYCLE_STATUS[c.status]}</Badge>
                  {c.reduction_tco2e !== null && (
                    <span className="block text-xs text-green-700">ลด {fmtNum(c.reduction_tco2e)} tCO₂e</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">อุปกรณ์วัดระดับน้ำ</h2>
        {plot.devices.length === 0 && <Empty>ยังไม่ได้ติดตั้งเซ็นเซอร์ในแปลงนี้</Empty>}
        <ul className="space-y-2 text-sm">
          {plot.devices.map((d) => (
            <li key={d.device_id} className="flex justify-between rounded-xl bg-stone-50 px-3 py-2">
              <span>
                <span className="font-medium">{d.serial_no}</span>
                <span className="block text-xs text-stone-500">ติดตั้ง {fmtDate(d.installed_at)}</span>
              </span>
              <span className="text-right text-xs text-stone-600">
                {d.last_reading_at ? (
                  <>
                    {fmtNum(d.last_level_cm, 1)} ซม. · 🔋 {d.last_battery_pct ?? '-'}%
                    <span className="block text-stone-500">{fmtDateTime(d.last_reading_at)}</span>
                  </>
                ) : (
                  'ยังไม่มีข้อมูล'
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">ไทม์ไลน์ภาพถ่ายดาวเทียม</h2>
        <p className="mb-2 text-xs text-stone-500">
          🌱 วันเริ่มปลูก · 🛰️ วันที่ดาวเทียมถ่ายภาพแปลงจริง · 🌾 วันเก็บเกี่ยว — ภาพ HLS (Sentinel-2/Landsat) ความละเอียด 30 ม.
          จาก NASA GIBS · วงสีเหลือง = ตำแหน่งแปลง
        </p>
        <PlotTimeline plotId={plotId} />
      </Card>
    </div>
  )
}
