import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api.js'
import { nowLocalISO } from '../format.js'
import { usePreferences } from '../preferences.jsx'
import CropStartFields, { appendCrop, emptyCrop } from './CropStartFields.jsx'
import { Button, ErrorBox, Field, inputClass, Modal } from './ui.jsx'

// Add a paddy and start farming it in one step: the paddy (name, area), the sensor node
// installed in it, and the AWD crop it starts with (planting-day photo required). The
// sensor ID links the node's water readings to this paddy, and the paddy's GPS position
// is filled in automatically from that node (services/api/app/mqtt_bridge.py).
function NewPaddyForm({ onCreated }) {
  const { t } = usePreferences()
  const [form, setForm] = useState({ paddy_name: '', area_rai: '', device_id: '' })
  const [crop, setCrop] = useState(emptyCrop)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('paddy_name', form.paddy_name.trim())
      body.append('area_rai', form.area_rai)
      body.append('device_id', form.device_id.trim())
      appendCrop(body, crop, nowLocalISO())
      onCreated(await api('/paddies', { method: 'POST', form: body }))
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-stone-700">{t('newPaddy.paddySection')}</legend>
        <Field label={t('newPaddy.name')}>
          <input
            required
            autoFocus
            maxLength={100}
            value={form.paddy_name}
            onChange={set('paddy_name')}
            className={inputClass}
            placeholder={t('newPaddy.namePlaceholder')}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('newPaddy.area')}>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={form.area_rai}
              onChange={set('area_rai')}
              className={inputClass}
            />
          </Field>
          <Field label={t('newPaddy.device')}>
            <input
              required
              maxLength={20}
              autoCapitalize="characters"
              autoComplete="off"
              value={form.device_id}
              onChange={set('device_id')}
              className={inputClass}
              placeholder="NODE-0001"
            />
          </Field>
        </div>
        <p className="text-xs text-stone-500">{t('newPaddy.deviceHint')}</p>
        <p className="flex items-start gap-1 text-xs text-stone-500">
          <MapPin size={14} className="mt-px shrink-0" aria-hidden="true" />
          {t('newPaddy.locationHint')}
        </p>
      </fieldset>

      <hr className="border-stone-200" />
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold text-stone-700">{t('newPaddy.cropSection')}</legend>
        <CropStartFields crop={crop} onChange={setCrop} />
      </fieldset>

      <ErrorBox error={error} />
      <Button type="submit" disabled={busy || !crop.photo} className="w-full">
        {busy ? t('common.saving') : t('newPaddy.save')}
      </Button>
    </form>
  )
}

export default function NewPaddyDialog({ open, onClose, onCreated }) {
  const { t } = usePreferences()
  return (
    <Modal open={open} onClose={onClose} title={t('newPaddy.title')}>
      <NewPaddyForm onCreated={onCreated} />
    </Modal>
  )
}
