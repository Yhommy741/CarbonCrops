import { useState } from 'react'
import { useNavigate } from 'react-router'
import { api, getPosition } from '../api.js'
import { Button, Card, ErrorBox, Field, inputClass, PageTitle } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

const EMPTY = {
  paddy_name: '',
  area_rai: '',
  province: '',
  district: '',
  subdistrict: '',
  land_doc_no: '',
  latitude: '',
  longitude: '',
}

const orNull = (v) => (v === '' ? null : v)

export default function NewPaddy() {
  const navigate = useNavigate()
  const { t } = usePreferences()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function useMyLocation() {
    setLocating(true)
    const pos = await getPosition()
    setLocating(false)
    if (!pos) return setError(new Error(t('errors.geolocation')))
    setForm((f) => ({ ...f, latitude: pos.latitude.toFixed(6), longitude: pos.longitude.toFixed(6) }))
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { paddy_id } = await api('/paddies', {
        method: 'POST',
        body: {
          paddy_name: form.paddy_name,
          area_rai: Number(form.area_rai),
          province: orNull(form.province),
          district: orNull(form.district),
          subdistrict: orNull(form.subdistrict),
          land_doc_no: orNull(form.land_doc_no),
          latitude: form.latitude === '' ? null : Number(form.latitude),
          longitude: form.longitude === '' ? null : Number(form.longitude),
        },
      })
      navigate(`/paddies/${paddy_id}`)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle title={t('newPaddy.title')} />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t('newPaddy.name')}>
            <input required value={form.paddy_name} onChange={set('paddy_name')} className={inputClass} placeholder={t('newPaddy.namePlaceholder')} />
          </Field>
          <Field label={t('newPaddy.area')}>
            <input required type="number" min="0.01" step="0.01" inputMode="decimal" value={form.area_rai} onChange={set('area_rai')} className={inputClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('newPaddy.province')}>
              <input value={form.province} onChange={set('province')} className={inputClass} />
            </Field>
            <Field label={t('newPaddy.district')}>
              <input value={form.district} onChange={set('district')} className={inputClass} />
            </Field>
            <Field label={t('newPaddy.subdistrict')}>
              <input value={form.subdistrict} onChange={set('subdistrict')} className={inputClass} />
            </Field>
          </div>
          <Field label={t('newPaddy.deed')} hint={t('newPaddy.deedHint')}>
            <input value={form.land_doc_no} onChange={set('land_doc_no')} className={inputClass} />
          </Field>
          <div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('newPaddy.latitude')}>
                <input type="number" step="any" value={form.latitude} onChange={set('latitude')} className={inputClass} />
              </Field>
              <Field label={t('newPaddy.longitude')}>
                <input type="number" step="any" value={form.longitude} onChange={set('longitude')} className={inputClass} />
              </Field>
            </div>
            <Button variant="secondary" className="mt-2" onClick={useMyLocation} disabled={locating}>
              📍 {locating ? t('newPaddy.locating') : t('newPaddy.useLocation')}
            </Button>
          </div>
          <ErrorBox error={error} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? t('common.saving') : t('newPaddy.save')}
          </Button>
        </form>
      </Card>
    </>
  )
}
