import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api, getPosition, useApi } from '../api.js'
import { Badge, Button, CALENDAR_COLOR, Card, CREDIT_COLOR, Empty, ErrorBox, Field, inputClass, Loading, PageTitle } from '../components/ui.jsx'
import { todayISO } from '../format.js'
import { usePreferences } from '../preferences.jsx'

function NewCalendarForm({ paddyId }) {
  const navigate = useNavigate()
  const { t } = usePreferences()
  const [form, setForm] = useState({ rice_variety: '', planting_date: todayISO(), planting_method: 'sowing' })
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
      const { calendar_id } = await api(`/paddies/${paddyId}/calendars`, { method: 'POST', form: body })
      navigate(`/calendars/${calendar_id}`)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('newCrop.variety')}>
          <input value={form.rice_variety} onChange={set('rice_variety')} className={inputClass} placeholder={t('newCrop.varietyPlaceholder')} />
        </Field>
        <Field label={t('newCrop.method')}>
          <select value={form.planting_method} onChange={set('planting_method')} className={inputClass}>
            <option value="sowing">{t('activity.sowing')}</option>
            <option value="transplanting">{t('activity.transplanting')}</option>
          </select>
        </Field>
        <Field label={t('newCrop.plantingDate')}>
          <input required type="date" max={todayISO()} value={form.planting_date} onChange={set('planting_date')} className={inputClass} />
        </Field>
      </div>
      <Field label={t('newCrop.photo')} hint={t('newCrop.photoHint')}>
        <input required type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files[0] ?? null)} className="block w-full text-sm" />
      </Field>
      <ErrorBox error={error} />
      <Button type="submit" disabled={busy || !photo}>
        {busy ? t('common.saving') : t('newCrop.start')}
      </Button>
    </form>
  )
}

export default function PaddyDetail() {
  const { paddyId } = useParams()
  const { t, fmt } = usePreferences()
  const { data: paddy, error, loading } = useApi(`/paddies/${paddyId}`)
  const [showNew, setShowNew] = useState(false)

  if (loading) return <Loading />
  if (error) return <ErrorBox error={error} />
  const growing = paddy.calendars.some((c) => c.status !== 'harvested')

  return (
    <div className="space-y-4">
      <PageTitle
        title={paddy.paddy_name}
        subtitle={`${t('common.rai', { n: fmt.num(paddy.area_rai) })} · ${[paddy.subdistrict, paddy.district, paddy.province].filter(Boolean).join(', ')}`}
      />

      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-stone-500">{t('paddy.owner')}</dt>
            <dd>{paddy.owner_name}</dd>
          </div>
          <div>
            <dt className="text-stone-500">{t('paddy.deed')}</dt>
            <dd>{paddy.land_doc_no || '-'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-stone-500">{t('paddy.gps')}</dt>
            <dd>
              {paddy.latitude ? (
                <a
                  className="text-green-800 underline"
                  href={`https://www.google.com/maps?q=${paddy.latitude},${paddy.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {paddy.latitude}, {paddy.longitude}
                </a>
              ) : (
                '-'
              )}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{t('paddy.crops')}</h2>
            <p className="text-xs text-stone-500">{t('paddy.completed', { n: paddy.completed_calendars })}</p>
          </div>
          {paddy.can_edit && !showNew && !growing && (
            <Button variant="secondary" onClick={() => setShowNew(true)}>
              {t('paddy.newCrop')}
            </Button>
          )}
        </div>
        {showNew && (
          <div className="mb-4 rounded-xl bg-stone-50 p-3">
            <NewCalendarForm paddyId={paddyId} />
          </div>
        )}
        {paddy.calendars.length === 0 && <Empty>{t('paddy.noCrops')}</Empty>}
        <ul className="divide-y divide-stone-100">
          {paddy.calendars.map((c) => (
            <li key={c.calendar_id}>
              <Link to={`/calendars/${c.calendar_id}`} className="flex items-center justify-between py-3 hover:text-green-800">
                <span>
                  <span className="block font-medium">{fmt.season(c)}</span>
                  <span className="text-xs text-stone-500">
                    {c.rice_variety} · {fmt.date(c.planting_date)} – {c.harvest_date ? fmt.date(c.harvest_date) : t('common.present')}
                  </span>
                </span>
                <span className="text-right">
                  <Badge color={CALENDAR_COLOR[c.status]}>{t(`calendarStatus.${c.status}`)}</Badge>
                  {c.credit_status && (
                    <span className="mt-1 block">
                      <Badge color={CREDIT_COLOR[c.credit_status]}>
                        {t(`creditStatus.${c.credit_status}`)} {fmt.num(c.credit_tco2e)} t
                      </Badge>
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t('paddy.devices')}</h2>
        {paddy.devices.length === 0 && <Empty>{t('paddy.noDevices')}</Empty>}
        <ul className="space-y-2 text-sm">
          {paddy.devices.map((d) => (
            <li key={d.device_id} className="flex justify-between rounded-xl bg-stone-50 px-3 py-2">
              <span>
                <span className="font-medium">{d.device_id}</span>
                <span className="block text-xs text-stone-500">
                  {t('paddy.installed', { date: fmt.date(d.installed_at) })} · 🔋 {d.battery_pct ?? '-'}%
                </span>
              </span>
              <span className="text-right text-xs text-stone-600">
                {d.last_reading_at ? (
                  <>
                    {fmt.num(d.last_level_cm, 1)} {t('common.cm')}
                    <span className="block text-stone-500">{fmt.dateTime(d.last_reading_at)}</span>
                  </>
                ) : (
                  t('paddy.noReadings')
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">{t('paddy.satellite')}</h2>
        <p className="mb-3 text-xs text-stone-500">{t('paddy.satelliteHint')}</p>
        {paddy.satellite_images.length === 0 && <Empty>{t('paddy.noImages')}</Empty>}
        <table className="w-full text-sm">
          {paddy.satellite_images.length > 0 && (
            <thead className="text-left text-xs text-stone-500">
              <tr>
                <th className="py-1 font-normal">{t('paddy.colDate')}</th>
                <th className="font-normal">{t('paddy.colSource')}</th>
                <th className="text-right font-normal">{t('paddy.colCloud')}</th>
                <th className="text-right font-normal">NDVI</th>
                <th className="text-right font-normal">NDWI</th>
              </tr>
            </thead>
          )}
          <tbody className="tabular-nums">
            {paddy.satellite_images.map((s) => (
              <tr key={s.image_id} className="border-t border-stone-100">
                <td className="py-1">{fmt.date(s.captured_at)}</td>
                <td>{s.source}</td>
                <td className="text-right text-stone-500">{s.cloud_cover_pct ?? '-'}%</td>
                <td className="text-right">{fmt.num(s.ndvi_value)}</td>
                <td className={`text-right ${Number(s.ndwi_value) >= 0 ? 'text-sky-700' : 'text-amber-700'}`}>{fmt.num(s.ndwi_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
