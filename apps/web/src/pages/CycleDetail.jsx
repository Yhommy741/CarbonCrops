import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, fileUrl, getPosition, useApi } from '../api.js'
import WaterChart from '../components/WaterChart.jsx'
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  inputClass,
  Loading,
  PageTitle,
  PHASE_COLOR,
  Photo,
  Stat,
  VERIFICATION_COLOR,
} from '../components/ui.jsx'
import {
  ACTIVITY_LABEL,
  CYCLE_STATUS,
  FERTILIZER_FORMULAS,
  fmtDate,
  fmtDateTime,
  fmtNum,
  PHASE_LABEL,
  REGIME_LABEL,
  todayISO,
  VERIFICATION_STATUS,
} from '../format.js'

/** Runs an async action with busy/error state, then reloads the page data. */
function useAction(onDone) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function run(fn) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onDone()
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

/** Adds the photo and the phone's GPS position (proof it was taken in the field). */
async function appendGeotaggedPhoto(form, photo) {
  form.append('photo', photo)
  form.append('captured_at', new Date().toISOString().slice(0, 19))
  const pos = await getPosition()
  if (pos) {
    form.append('latitude', pos.latitude.toFixed(6))
    form.append('longitude', pos.longitude.toFixed(6))
  }
}

function PhaseRow({ phase }) {
  return (
    <li className="flex items-start justify-between gap-2 py-2">
      <span>
        <Badge color={PHASE_COLOR[phase.phase_type]}>{PHASE_LABEL[phase.phase_type]}</Badge>
        <span className="ml-2 text-xs text-stone-500">
          {phase.days} วัน
          {phase.min_level_cm !== null && ` · ต่ำสุด ${fmtNum(phase.min_level_cm, 1)} ซม.`}
        </span>
      </span>
      <span className="whitespace-nowrap text-xs text-stone-500">
        {fmtDate(phase.start_date)} – {phase.end_date ? fmtDate(phase.end_date) : 'ปัจจุบัน'}
      </span>
    </li>
  )
}

// ---------- water (IoT only) ----------

function WaterTab({ cycle }) {
  const series = cycle.water_series
  const latest = series.at(-1)
  const current = cycle.phases.at(-1)
  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 grid grid-cols-3 gap-3">
          <Stat label="ระดับน้ำล่าสุด" value={latest ? fmtNum(latest.level, 1) : '–'} unit="ซม." tone="text-sky-700" />
          <Stat label="ช่วงปัจจุบัน" value={current ? PHASE_LABEL[current.phase_type] : '–'} />
          <Stat label="ข้อมูลเซ็นเซอร์ครบ" value={cycle.mrv_preview.sensor_coverage_pct} unit="% ของวัน" />
        </div>
        <WaterChart series={series} phases={cycle.phases} />
        <p className="mt-1 text-xs text-stone-500">
          ข้อมูลจากเซ็นเซอร์วัดระดับน้ำทุก 4 ชั่วโมง{latest && ` · ล่าสุด ${fmtDateTime(latest.t)}`} · เส้นแดง = −15 ซม. ควรเติมน้ำ
        </p>
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold">ช่วงน้ำที่ระบบตรวจพบ</h2>
        <p className="mb-2 text-xs text-stone-500">
          คำนวณจากข้อมูลเซ็นเซอร์อัตโนมัติ: น้ำต่ำกว่าผิวดิน = ปล่อยแห้ง, ช่วงที่ไม่มีข้อมูลจะไม่นับเป็นหลักฐาน
        </p>
        {cycle.phases.length === 0 && <Empty>ยังไม่มีข้อมูล</Empty>}
        <ol className="divide-y divide-stone-100 text-sm">
          {cycle.phases.map((ph) => (
            <PhaseRow key={ph.start_date} phase={ph} />
          ))}
        </ol>
      </Card>
    </div>
  )
}

// ---------- farmer records ----------

function FertilizerForm({ cycle, reload }) {
  const { busy, error, run } = useAction(reload)
  const [form, setForm] = useState({ formula: FERTILIZER_FORMULAS[0], kg: '', date: todayISO() })
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const totalKg = form.kg ? Number(form.kg) * Number(cycle.plot.area_rai) : null

  async function submit(e) {
    e.preventDefault()
    const body = new FormData()
    body.append('activity_type', 'fertilizing')
    body.append('activity_date', form.date)
    body.append('fertilizer_formula', form.formula)
    body.append('fertilizer_kg_per_rai', form.kg)
    if (await run(() => api(`/cycles/${cycle.cycle_id}/activities`, { method: 'POST', form: body }))) {
      setForm({ ...form, kg: '' })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="สูตรปุ๋ย">
          <select value={form.formula} onChange={set('formula')} className={inputClass}>
            {FERTILIZER_FORMULAS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="จำนวน (กก./ไร่)" hint={totalKg ? `รวม ${fmtNum(totalKg, 0)} กก. (${fmtNum(cycle.plot.area_rai)} ไร่)` : null}>
          <input required type="number" min="0.5" max="500" step="0.5" inputMode="decimal" value={form.kg} onChange={set('kg')} className={inputClass} />
        </Field>
        <Field label="วันที่ใส่">
          <input required type="date" min={cycle.start_date} max={todayISO()} value={form.date} onChange={set('date')} className={inputClass} />
        </Field>
      </div>
      <ErrorBox error={error} />
      <Button type="submit" disabled={busy}>
        {busy ? 'กำลังบันทึก…' : 'บันทึกการใส่ปุ๋ย'}
      </Button>
    </form>
  )
}

/** Planting or harvest: a geotagged photo of the field on that day. */
function PhotoForm({ cycle, kind, reload }) {
  const { busy, error, run } = useAction(reload)
  const [date, setDate] = useState(kind === 'planting' ? cycle.start_date : todayISO())
  const [photo, setPhoto] = useState(null)
  const [note, setNote] = useState('')

  async function submit(e) {
    e.preventDefault()
    const form = new FormData()
    form.append('activity_type', kind)
    form.append('activity_date', date)
    if (note) form.append('note', note)
    await appendGeotaggedPhoto(form, photo)
    await run(() => api(`/cycles/${cycle.cycle_id}/activities`, { method: 'POST', form }))
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={kind === 'harvest' ? 'วันเก็บเกี่ยว' : 'วันเริ่มปลูก'}>
          <input
            required
            type="date"
            min={cycle.start_date}
            max={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            disabled={kind === 'planting'}
          />
        </Field>
        <Field label="รูปถ่ายแปลงนา" hint="ถ่ายที่แปลง ระบบจะบันทึกพิกัด GPS ให้ผู้ตรวจสอบ">
          <input required type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files[0] ?? null)} className="block w-full text-sm" />
        </Field>
      </div>
      {kind === 'harvest' && (
        <Field label="ผลผลิต / หมายเหตุ (ไม่บังคับ)">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="เช่น ได้ข้าว 780 กก./ไร่" />
        </Field>
      )}
      <ErrorBox error={error} />
      <Button type="submit" disabled={busy || !photo}>
        {busy ? 'กำลังบันทึก…' : kind === 'harvest' ? 'บันทึกการเก็บเกี่ยว' : 'บันทึกรูปวันปลูก'}
      </Button>
      {kind === 'harvest' && <p className="text-xs text-stone-500">เมื่อบันทึกแล้วรอบนี้จะปิดเป็น “เก็บเกี่ยวแล้ว” และส่งตรวจสอบคาร์บอนได้</p>}
    </form>
  )
}

function ActivityItem({ a }) {
  return (
    <li className="rounded-xl bg-stone-50 p-3 text-sm">
      <div className="flex justify-between gap-2">
        <span className="font-medium">
          {ACTIVITY_LABEL[a.activity_type]}
          {a.fertilizer_formula && (
            <span className="ml-2 font-normal text-stone-700">
              สูตร {a.fertilizer_formula} · {fmtNum(a.fertilizer_kg_per_rai, 1)} กก./ไร่
            </span>
          )}
        </span>
        <span className="text-xs text-stone-500">{fmtDate(a.activity_date)}</span>
      </div>
      {a.note && <p className="text-stone-700">{a.note}</p>}
      <p className="text-xs text-stone-500">บันทึกโดย {a.recorded_by_name}</p>
      {a.evidence.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {a.evidence.map((ev) => (
            <a key={ev.evidence_id} href={fileUrl(ev.file_path)} target="_blank" rel="noreferrer" className="text-xs">
              <Photo src={fileUrl(ev.file_path)} alt={ACTIVITY_LABEL[a.activity_type]} className="h-24 w-32" />
              <span className="block text-stone-500">
                {ev.latitude ? `📍 ${fmtNum(ev.latitude, 4)}, ${fmtNum(ev.longitude, 4)}` : 'ไม่มีพิกัด'}
              </span>
            </a>
          ))}
        </div>
      )}
    </li>
  )
}

function RecordsTab({ cycle, reload }) {
  const [form, setForm] = useState(null)
  const canEdit = cycle.can_edit
  const active = cycle.status === 'active'
  const actions = [
    !cycle.has_planting_photo && { id: 'planting', label: '📷 รูปวันปลูก' },
    active && { id: 'fertilizing', label: '🌱 ใส่ปุ๋ย' },
    active && { id: 'harvest', label: '🌾 เก็บเกี่ยว' },
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      {canEdit && actions.length > 0 && (
        <Card>
          <h2 className="mb-1 font-semibold">บันทึกของเกษตรกร</h2>
          <p className="mb-3 text-xs text-stone-500">ระดับน้ำบันทึกอัตโนมัติจากเซ็นเซอร์ เกษตรกรบันทึกแค่วันปลูก ปุ๋ย และวันเก็บเกี่ยว</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button key={a.id} variant={form === a.id ? 'primary' : 'secondary'} onClick={() => setForm(form === a.id ? null : a.id)}>
                {a.label}
              </Button>
            ))}
          </div>
          {form === 'fertilizing' && <FertilizerForm cycle={cycle} reload={reload} />}
          {(form === 'planting' || form === 'harvest') && <PhotoForm key={form} cycle={cycle} kind={form} reload={reload} />}
        </Card>
      )}

      {cycle.fertilizer.length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold">ปุ๋ยที่ใช้ทั้งรอบ</h2>
          <ul className="space-y-1 text-sm">
            {cycle.fertilizer.map((f) => (
              <li key={f.formula} className="flex justify-between">
                <span>สูตร {f.formula}</span>
                <span className="tabular-nums text-stone-700">
                  {fmtNum(f.kg_per_rai, 1)} กก./ไร่ · รวม {fmtNum(f.total_kg, 0)} กก.
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">ประวัติการบันทึก</h2>
        {cycle.activities.length === 0 && <Empty>ยังไม่มีการบันทึก</Empty>}
        <ol className="space-y-3">
          {cycle.activities.map((a) => (
            <ActivityItem key={a.activity_id} a={a} />
          ))}
        </ol>
      </Card>
    </div>
  )
}

// ---------- carbon / MRV ----------

function MrvTab({ cycle, reload }) {
  const { busy, error, run } = useAction(reload)
  const mrv = cycle.mrv_preview
  const est = cycle.latest_estimate
  const finished = cycle.status === 'harvested' || cycle.status === 'closed'
  const openRequest = cycle.verifications.find((v) => v.status === 'pending' || v.status === 'in_review')
  const approved = cycle.verifications.some((v) => v.status === 'approved')
  const gaps = mrv.phases.filter((p) => p.phase_type === 'no_data')

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold">ผลคำนวณการลดก๊าซมีเทน {finished ? '' : '(ระหว่างปลูก)'}</h2>
          <p className="text-xs text-stone-500">
            วิธี {mrv.method_version} · {mrv.days} วัน · {fmtNum(mrv.area_ha, 2)} เฮกตาร์ · ข้อมูลเซ็นเซอร์ครบ {mrv.sensor_coverage_pct}%
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="ถ้าขังน้ำตลอด" value={fmtNum(mrv.baseline_tco2e)} unit="tCO₂e" />
          <Stat label="ทำ AWD จริง" value={fmtNum(mrv.project_tco2e)} unit="tCO₂e" />
          <Stat label="ลดได้" value={fmtNum(mrv.reduction_tco2e)} unit="tCO₂e" tone="text-green-700" />
        </div>
        <p className="text-sm">
          รูปแบบน้ำที่เซ็นเซอร์ยืนยันได้: <strong>{REGIME_LABEL[mrv.water_regime]}</strong> (ค่าปรับ SF<sub>w</sub> = {mrv.sf_w})
        </p>

        <div>
          <h3 className="mb-1 text-sm font-medium">ช่วงปล่อยแห้งที่ตรวจพบ</h3>
          {mrv.drying_phases.length === 0 && <Empty>ไม่พบช่วงปล่อยแห้ง</Empty>}
          <ul className="space-y-1 text-sm">
            {mrv.drying_phases.map((d) => (
              <li key={d.start_date} className="flex justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2">
                <span>
                  {fmtDate(d.start_date)} – {d.end_date ? fmtDate(d.end_date) : 'ปัจจุบัน'}
                  <span className="block text-xs text-stone-500">
                    {d.days} วัน · {d.readings} ค่าวัด · ต่ำสุด {fmtNum(d.min_level_cm, 1)} ซม.
                  </span>
                </span>
                {d.confirmed ? <Badge color="green">นับได้</Badge> : <Badge color="amber">แห้งไม่ถึง {mrv.dry_level_cm} ซม.</Badge>}
              </li>
            ))}
          </ul>
          {gaps.length > 0 && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              เซ็นเซอร์ไม่ส่งข้อมูล {gaps.map((g) => `${fmtDate(g.start_date)} – ${fmtDate(g.end_date)}`).join(', ')}{' '}
              หากมีการปล่อยแห้งในช่วงนี้จะไม่ถูกนับ
            </p>
          )}
        </div>

        {cycle.can_edit && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => run(() => api(`/cycles/${cycle.cycle_id}/estimate`, { method: 'POST' }))}
            >
              บันทึกผลคำนวณนี้
            </Button>
            <Button
              disabled={busy || !est || !finished || Boolean(openRequest) || approved}
              onClick={() => run(() => api(`/cycles/${cycle.cycle_id}/submit`, { method: 'POST' }))}
            >
              ส่งให้ผู้ตรวจสอบ (VVB)
            </Button>
          </div>
        )}
        {cycle.can_edit && !finished && <p className="text-xs text-stone-500">ส่งตรวจสอบได้หลังบันทึกการเก็บเกี่ยว</p>}
        {cycle.can_edit && finished && !est && <p className="text-xs text-stone-500">บันทึกผลคำนวณก่อน จึงจะส่งตรวจสอบได้</p>}
        {openRequest && <p className="text-xs text-stone-500">มีคำขอที่รอผลอยู่แล้ว</p>}
        <ErrorBox error={error} />
      </Card>

      {est && (
        <Card>
          <h2 className="mb-1 font-semibold">ผลคำนวณที่บันทึกล่าสุด</h2>
          <p className="text-sm">
            ลดได้ <strong className="text-green-700">{fmtNum(est.reduction_tco2e)} tCO₂e</strong> · {est.method_version} ·{' '}
            {fmtDateTime(est.calculated_at)}
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">การตรวจสอบ</h2>
        {cycle.verifications.length === 0 && <Empty>ยังไม่เคยส่งตรวจสอบ</Empty>}
        <ul className="space-y-2 text-sm">
          {cycle.verifications.map((v) => (
            <li key={v.verification_id} className="rounded-xl bg-stone-50 p-3">
              <div className="flex justify-between">
                <Badge color={VERIFICATION_COLOR[v.status]}>{VERIFICATION_STATUS[v.status]}</Badge>
                <span className="text-xs text-stone-500">ส่งเมื่อ {fmtDate(v.submitted_at)}</span>
              </div>
              {v.verifier_name && <p className="mt-1 text-xs text-stone-500">ผู้ตรวจ: {v.verifier_name}</p>}
              {v.comment && <p className="mt-1 text-stone-700">“{v.comment}”</p>}
            </li>
          ))}
        </ul>
        {cycle.reports.length > 0 && (
          <div className="mt-3 space-y-1">
            {cycle.reports.map((r) => (
              <Link key={r.report_id} to={`/reports/${r.report_id}`} className="block text-sm text-green-800 underline">
                📄 รายงาน {r.report_no} ({fmtNum(r.reduction_tco2e)} tCO₂e)
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ---------- page ----------

const TABS = [
  { id: 'water', label: 'ระดับน้ำ' },
  { id: 'records', label: 'บันทึกแปลง' },
  { id: 'mrv', label: 'คาร์บอน (MRV)' },
]

export default function CycleDetail() {
  const { cycleId } = useParams()
  const { data: cycle, error, loading, reload } = useApi(`/cycles/${cycleId}`)
  const [tab, setTab] = useState('water')

  if (loading && !cycle) return <Loading />
  if (error) return <ErrorBox error={error} />

  return (
    <>
      <Link to={`/plots/${cycle.plot.plot_id}`} className="text-sm text-stone-500 hover:text-green-800">
        ← {cycle.plot.plot_name}
      </Link>
      <PageTitle
        title={cycle.cycle_name}
        subtitle={`${cycle.rice_variety ?? ''} · ${fmtDate(cycle.start_date)} – ${cycle.end_date ? fmtDate(cycle.end_date) : 'ปัจจุบัน'} · ${CYCLE_STATUS[cycle.status]}`}
      />
      <div role="tablist" className="mb-4 grid grid-cols-3 rounded-xl bg-stone-200/60 p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg py-2 ${tab === t.id ? 'bg-white font-medium shadow-sm' : 'text-stone-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'water' && <WaterTab cycle={cycle} />}
      {tab === 'records' && <RecordsTab cycle={cycle} reload={reload} />}
      {tab === 'mrv' && <MrvTab cycle={cycle} reload={reload} />}
    </>
  )
}
