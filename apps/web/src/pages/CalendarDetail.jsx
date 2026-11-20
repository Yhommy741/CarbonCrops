import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, fileUrl, getPosition, useApi } from '../api.js'
import WaterChart from '../components/WaterChart.jsx'
import {
  Badge,
  Button,
  Card,
  CREDIT_COLOR,
  Empty,
  ErrorBox,
  Field,
  inputClass,
  Loading,
  PageTitle,
  PHASE_COLOR,
  Photo,
  Stat,
} from '../components/ui.jsx'
import { FERTILIZER_FORMULAS, todayISO } from '../format.js'
import { usePreferences } from '../preferences.jsx'

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
  const { t, fmt } = usePreferences()
  return (
    <li className="flex items-start justify-between gap-2 py-2">
      <span>
        <Badge color={PHASE_COLOR[phase.phase_type]}>{t(`phase.${phase.phase_type}`)}</Badge>
        <span className="ml-2 text-xs text-stone-500">
          {t('water.phaseDays', { n: phase.days })}
          {phase.min_level_cm !== null && ` · ${t('water.phaseMin', { level: fmt.num(phase.min_level_cm, 1) })}`}
        </span>
      </span>
      <span className="whitespace-nowrap text-xs text-stone-500">
        {fmt.date(phase.start_date)} – {phase.end_date ? fmt.date(phase.end_date) : t('common.present')}
      </span>
    </li>
  )
}

// ---------- water (IoT only) ----------

function WaterTab({ calendar }) {
  const { t, fmt } = usePreferences()
  const series = calendar.water_series
  const latest = series.at(-1)
  const current = calendar.phases.at(-1)
  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 grid grid-cols-3 gap-3">
          <Stat label={t('water.latest')} value={latest ? fmt.num(latest.level, 1) : '–'} unit={t('common.cm')} tone="text-sky-700" />
          <Stat label={t('water.current')} value={current ? t(`phase.${current.phase_type}`) : '–'} />
          <Stat label={t('water.coverage')} value={calendar.mrv_preview.sensor_coverage_pct} unit={t('water.coverageUnit')} />
        </div>
        <WaterChart series={series} phases={calendar.phases} />
        <p className="mt-1 text-xs text-stone-500">
          {[t('water.note'), latest && t('water.noteLatest', { time: fmt.dateTime(latest.t) }), t('water.noteLine')]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold">{t('water.detected')}</h2>
        <p className="mb-2 text-xs text-stone-500">{t('water.detectedHint')}</p>
        {calendar.phases.length === 0 && <Empty>{t('water.noData')}</Empty>}
        <ol className="divide-y divide-stone-100 text-sm">
          {calendar.phases.map((ph) => (
            <PhaseRow key={ph.start_date} phase={ph} />
          ))}
        </ol>
      </Card>
    </div>
  )
}

// ---------- farmer records ----------

function FertilizerForm({ calendar, reload }) {
  const { t, fmt } = usePreferences()
  const { busy, error, run } = useAction(reload)
  const [form, setForm] = useState({ formula: FERTILIZER_FORMULAS[0], kg: '', date: todayISO() })
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const totalKg = form.kg ? Number(form.kg) * Number(calendar.paddy.area_rai) : null

  async function submit(e) {
    e.preventDefault()
    const body = new FormData()
    body.append('activity_type', 'fertilizing')
    body.append('activity_date', form.date)
    body.append('fertilizer_formula', form.formula)
    body.append('fertilizer_kg_per_rai', form.kg)
    if (await run(() => api(`/calendars/${calendar.calendar_id}/activities`, { method: 'POST', form: body }))) {
      setForm({ ...form, kg: '' })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label={t('records.formula')}>
          <select value={form.formula} onChange={set('formula')} className={inputClass}>
            {FERTILIZER_FORMULAS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field
          label={t('records.amount')}
          hint={totalKg ? t('records.amountTotal', { kg: fmt.num(totalKg, 0), rai: fmt.num(calendar.paddy.area_rai) }) : null}
        >
          <input required type="number" min="0.5" max="500" step="0.5" inputMode="decimal" value={form.kg} onChange={set('kg')} className={inputClass} />
        </Field>
        <Field label={t('records.date')}>
          <input required type="date" min={calendar.planting_date} max={todayISO()} value={form.date} onChange={set('date')} className={inputClass} />
        </Field>
      </div>
      <ErrorBox error={error} />
      <Button type="submit" disabled={busy}>
        {busy ? t('common.saving') : t('records.saveFertilizer')}
      </Button>
    </form>
  )
}

/** Planting or harvest: a geotagged photo of the field on that day. */
function PhotoForm({ calendar, kind, reload }) {
  const { t, fmt } = usePreferences()
  const { busy, error, run } = useAction(reload)
  const isHarvest = kind === 'harvest'
  const [date, setDate] = useState(isHarvest ? todayISO() : calendar.planting_date)
  const [method, setMethod] = useState('sowing')
  const [photo, setPhoto] = useState(null)
  const [note, setNote] = useState('')

  async function submit(e) {
    e.preventDefault()
    const form = new FormData()
    form.append('activity_type', isHarvest ? 'harvest' : method)
    form.append('activity_date', date)
    if (note) form.append('note', note)
    await appendGeotaggedPhoto(form, photo)
    await run(() => api(`/calendars/${calendar.calendar_id}/activities`, { method: 'POST', form }))
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {isHarvest ? (
          <Field label={t('records.harvestDate')}>
            <input required type="date" min={calendar.planting_date} max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
        ) : (
          <Field label={t('records.method')} hint={t('records.methodHint', { date: fmt.date(calendar.planting_date) })}>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
              <option value="sowing">{t('activity.sowing')}</option>
              <option value="transplanting">{t('activity.transplanting')}</option>
            </select>
          </Field>
        )}
        <Field label={t('records.photo')} hint={t('records.photoHint')}>
          <input required type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files[0] ?? null)} className="block w-full text-sm" />
        </Field>
      </div>
      {isHarvest && (
        <Field label={t('records.yield')}>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder={t('records.yieldPlaceholder')} />
        </Field>
      )}
      <ErrorBox error={error} />
      <Button type="submit" disabled={busy || !photo}>
        {busy ? t('common.saving') : isHarvest ? t('records.saveHarvest') : t('records.savePlanting')}
      </Button>
      {isHarvest && <p className="text-xs text-stone-500">{t('records.harvestNote')}</p>}
    </form>
  )
}

function ActivityItem({ a }) {
  const { t, fmt } = usePreferences()
  const label = t(`activity.${a.activity_type}`)
  return (
    <li className="rounded-xl bg-stone-50 p-3 text-sm">
      <div className="flex justify-between gap-2">
        <span className="font-medium">
          {label}
          {a.fertilizer_formula && (
            <span className="ml-2 font-normal text-stone-700">
              {t('records.activityFertilizer', { formula: a.fertilizer_formula, kg: fmt.num(a.fertilizer_kg_per_rai, 1) })}
            </span>
          )}
        </span>
        <span className="text-xs text-stone-500">{fmt.date(a.activity_date)}</span>
      </div>
      {a.note && <p className="text-stone-700">{a.note}</p>}
      <p className="text-xs text-stone-500">{t('calendar.stage', { stage: fmt.stage(a.stage_no) })}</p>
      {a.evidence.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {a.evidence.map((ev) => (
            <a key={ev.evidence_id} href={fileUrl(ev.file_path)} target="_blank" rel="noreferrer" className="text-xs">
              <Photo src={fileUrl(ev.file_path)} alt={label} className="h-24 w-32" />
              <span className="block text-stone-500">
                {ev.latitude ? `📍 ${fmt.num(ev.latitude, 4)}, ${fmt.num(ev.longitude, 4)}` : t('common.noLocation')}
              </span>
            </a>
          ))}
        </div>
      )}
    </li>
  )
}

function RecordsTab({ calendar, reload }) {
  const { t, fmt } = usePreferences()
  const [form, setForm] = useState(null)
  const active = calendar.status === 'active'
  const actions = [
    !calendar.has_planting_photo && { id: 'planting', label: t('records.plantingPhoto') },
    active && { id: 'fertilizing', label: t('records.fertilizer') },
    active && { id: 'harvest', label: t('records.harvest') },
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      {calendar.can_edit && actions.length > 0 && (
        <Card>
          <h2 className="mb-1 font-semibold">{t('records.title')}</h2>
          <p className="mb-3 text-xs text-stone-500">{t('records.hint')}</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button key={a.id} variant={form === a.id ? 'primary' : 'secondary'} onClick={() => setForm(form === a.id ? null : a.id)}>
                {a.label}
              </Button>
            ))}
          </div>
          {form === 'fertilizing' && <FertilizerForm calendar={calendar} reload={reload} />}
          {(form === 'planting' || form === 'harvest') && <PhotoForm key={form} calendar={calendar} kind={form} reload={reload} />}
        </Card>
      )}

      {calendar.fertilizer.length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold">{t('records.fertilizerTotal')}</h2>
          <ul className="space-y-1 text-sm">
            {calendar.fertilizer.map((f) => (
              <li key={f.formula} className="flex justify-between">
                <span>{t('records.formulaRow', { formula: f.formula })}</span>
                <span className="tabular-nums text-stone-700">
                  {t('records.formulaAmount', { perRai: fmt.num(f.kg_per_rai, 1), total: fmt.num(f.total_kg, 0) })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">{t('records.history')}</h2>
        {calendar.activities.length === 0 && <Empty>{t('records.empty')}</Empty>}
        <ol className="space-y-3">
          {calendar.activities.map((a) => (
            <ActivityItem key={a.activity_id} a={a} />
          ))}
        </ol>
      </Card>
    </div>
  )
}

// ---------- carbon / MRV ----------

function MrvTab({ calendar, reload }) {
  const { t, fmt } = usePreferences()
  const { busy, error, run } = useAction(reload)
  const mrv = calendar.mrv_preview
  const credit = calendar.credit
  const harvested = calendar.status === 'harvested'
  const canSubmit = harvested && (!credit || credit.credit_status === 'failed') && mrv.reduction_tco2e > 0
  const gaps = mrv.phases.filter((p) => p.phase_type === 'no_data')

  return (
    <div className="space-y-4">
      {credit && (
        <Card className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('mrv.creditTitle')}</h2>
            <Badge color={CREDIT_COLOR[credit.credit_status]}>{t(`creditStatus.${credit.credit_status}`)}</Badge>
          </div>
          <p className="text-sm">
            {t('mrv.requested')} <strong className="text-green-700">{fmt.num(credit.credit_tco2e)} tCO₂e</strong> ·{' '}
            {t('mrv.submittedAt', { time: fmt.dateTime(credit.submitted_at) })}
          </p>
          {credit.credit_status === 'passed' && (
            <p className="text-sm">
              {t('mrv.value')} <strong>{fmt.baht(credit.amount_thb)}</strong> ·{' '}
              <Link to={`/reports/${credit.credit_id}`} className="text-green-800 underline">
                {t('mrv.viewCertificate')}
              </Link>
            </p>
          )}
          {credit.verifier_name && (
            <p className="text-xs text-stone-500">
              {t('mrv.verifiedBy', { name: credit.verifier_name, time: fmt.dateTime(credit.verified_at) })}
            </p>
          )}
          {credit.verify_comment && <p className="text-sm text-stone-700">“{credit.verify_comment}”</p>}
        </Card>
      )}

      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold">
            {t('mrv.title')} {harvested ? '' : t('mrv.growing')}
          </h2>
          <p className="text-xs text-stone-500">
            {t('mrv.meta', {
              method: mrv.method_version,
              days: mrv.days,
              ha: fmt.num(mrv.area_ha, 2),
              pct: mrv.sensor_coverage_pct,
            })}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label={t('mrv.baseline')} value={fmt.num(mrv.baseline_tco2e)} unit="tCO₂e" />
          <Stat label={t('mrv.project')} value={fmt.num(mrv.project_tco2e)} unit="tCO₂e" />
          <Stat label={t('mrv.reduction')} value={fmt.num(mrv.reduction_tco2e)} unit="tCO₂e" tone="text-green-700" />
        </div>
        <p className="text-sm">
          {t('mrv.regime')} <strong>{t(`regime.${mrv.water_regime}`)}</strong> ({t('mrv.factor')} SF<sub>w</sub> = {mrv.sf_w})
        </p>

        <div>
          <h3 className="mb-1 text-sm font-medium">{t('mrv.dryingTitle')}</h3>
          {mrv.drying_phases.length === 0 && <Empty>{t('mrv.noDrying')}</Empty>}
          <ul className="space-y-1 text-sm">
            {mrv.drying_phases.map((d) => (
              <li key={d.start_date} className="flex justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2">
                <span>
                  {fmt.date(d.start_date)} – {d.end_date ? fmt.date(d.end_date) : t('common.present')}
                  <span className="block text-xs text-stone-500">
                    {t('mrv.dryingMeta', { days: d.days, readings: d.readings, level: fmt.num(d.min_level_cm, 1) })}
                  </span>
                </span>
                {d.confirmed ? (
                  <Badge color="green">{t('mrv.counts')}</Badge>
                ) : (
                  <Badge color="amber">{t('mrv.tooShallow', { level: mrv.dry_level_cm })}</Badge>
                )}
              </li>
            ))}
          </ul>
          {gaps.length > 0 && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              {t('mrv.gaps', { ranges: gaps.map((g) => `${fmt.date(g.start_date)} – ${fmt.date(g.end_date)}`).join(', ') })}
            </p>
          )}
        </div>

        {calendar.can_edit && (
          <>
            <Button
              disabled={busy || !canSubmit}
              onClick={() => run(() => api(`/calendars/${calendar.calendar_id}/submit`, { method: 'POST' }))}
            >
              {credit?.credit_status === 'failed' ? t('mrv.resubmit') : t('mrv.submit')} · {fmt.num(mrv.reduction_tco2e)} tCO₂e
            </Button>
            {!harvested && <p className="text-xs text-stone-500">{t('mrv.afterHarvest')}</p>}
            {harvested && mrv.reduction_tco2e <= 0 && <p className="text-xs text-stone-500">{t('mrv.nothingToClaim')}</p>}
          </>
        )}
        <ErrorBox error={error} />
      </Card>
    </div>
  )
}

// ---------- page ----------

const TABS = [
  { id: 'water', label: 'calendar.tabWater' },
  { id: 'records', label: 'calendar.tabRecords' },
  { id: 'mrv', label: 'calendar.tabCarbon' },
]

export default function CalendarDetail() {
  const { calendarId } = useParams()
  const { t, fmt } = usePreferences()
  const { data: calendar, error, loading, reload } = useApi(`/calendars/${calendarId}`)
  const [tab, setTab] = useState('water')

  if (loading && !calendar) return <Loading />
  if (error) return <ErrorBox error={error} />

  const subtitle = [
    calendar.rice_variety,
    `${fmt.date(calendar.planting_date)} – ${calendar.harvest_date ? fmt.date(calendar.harvest_date) : t('common.present')}`,
    t(`calendarStatus.${calendar.status}`),
    calendar.current_stage && t('calendar.stage', { stage: fmt.stage(calendar.current_stage.stage_no) }),
  ]
  return (
    <>
      <Link to={`/paddies/${calendar.paddy.paddy_id}`} className="text-sm text-stone-500 hover:text-green-800">
        ← {calendar.paddy.paddy_name}
      </Link>
      <PageTitle title={fmt.season(calendar)} subtitle={subtitle.filter(Boolean).join(' · ')} />
      <div role="tablist" className="mb-4 grid grid-cols-3 rounded-xl bg-stone-200/60 p-1 text-sm">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            onClick={() => setTab(tb.id)}
            className={`rounded-lg py-2 ${tab === tb.id ? 'bg-white font-medium shadow-sm' : 'text-stone-600'}`}
          >
            {t(tb.label)}
          </button>
        ))}
      </div>
      {tab === 'water' && <WaterTab calendar={calendar} />}
      {tab === 'records' && <RecordsTab calendar={calendar} reload={reload} />}
      {tab === 'mrv' && <MrvTab calendar={calendar} reload={reload} />}
    </>
  )
}
