import { useState } from 'react'
import { api } from '../api.js'
import { FERTILIZER_FORMULAS, nowLocalISO, todayISO } from '../format.js'
import { usePreferences } from '../preferences.jsx'
import PhotoPicker from './PhotoPicker.jsx'
import { Button, ErrorBox, Field, inputClass } from './ui.jsx'

// Farmer records on a growing crop, used on the dashboard card and the crop page.
// `calendar` needs calendar_id, planting_date and paddy.area_rai; `reload` runs after saving.

/** Runs an async action with busy/error state, then reloads the page data. */
export function useAction(onDone) {
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

/** Adds the photo and when it was taken (user's local time). The paddy's position
 *  comes from its sensor node, so the phone's GPS isn't needed. */
function appendPhoto(form, photo) {
  form.append('photo', photo)
  form.append('captured_at', nowLocalISO())
}

export function FertilizerForm({ calendar, reload }) {
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

/** Harvest: the date, how much rice was harvested (kg, the API works out kg/rai) and a photo of the field.
 *  (The planting photo is taken when the crop is added.) */
export function HarvestForm({ calendar, reload }) {
  const { t } = usePreferences()
  const { busy, error, run } = useAction(reload)
  const [date, setDate] = useState(todayISO())
  const [photo, setPhoto] = useState(null)
  const [kg, setKg] = useState('')

  async function submit(e) {
    e.preventDefault()
    const form = new FormData()
    form.append('activity_type', 'harvest')
    form.append('activity_date', date)
    form.append('harvest_kg', kg)
    appendPhoto(form, photo)
    await run(() => api(`/calendars/${calendar.calendar_id}/activities`, { method: 'POST', form }))
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t('records.harvestDate')}>
        <input required type="date" min={calendar.planting_date} max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </Field>
      <PhotoPicker label={t('records.photo')} hint={t('records.photoHint')} photo={photo} onChange={setPhoto} />
      <Field label={t('records.harvestKg')} hint={t('records.harvestKgHint')}>
        <input
          required
          type="number"
          min="1"
          max="1000000"
          step="any"
          inputMode="decimal"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          className={inputClass}
        />
      </Field>
      <ErrorBox error={error} />
      <Button type="submit" disabled={busy || !photo || !(Number(kg) > 0)}>
        {busy ? t('common.saving') : t('records.saveHarvest')}
      </Button>
      <p className="text-xs text-stone-500">{t('records.harvestNote')}</p>
    </form>
  )
}
