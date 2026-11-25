import { Battery, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, MapPin, Plus, Trash2, Wheat } from 'lucide-react'
import { useState } from 'react'
import { api, useApi } from '../api.js'
import { useAuth } from '../auth.jsx'
import { FertilizerForm, HarvestForm } from '../components/CropRecordForms.jsx'
import NewPaddyDialog from '../components/NewPaddyDialog.jsx'
import ScrollWaterChart from '../components/ScrollWaterChart.jsx'
import { Button, Card, Empty, ErrorBox, Loading, Modal, PageTitle } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

function levelTone(level) {
  if (level === undefined) return 'text-stone-400'
  if (level <= -15) return 'text-red-600'
  if (level < 0) return 'text-amber-600'
  return 'text-sky-700'
}

/** Battery icon matching the charge level (plain outline until the sensor reports it). */
function BatteryIcon({ pct }) {
  const Icon =
    pct === null ? Battery : pct < 20 ? BatteryWarning : pct < 50 ? BatteryLow : pct < 80 ? BatteryMedium : BatteryFull
  return <Icon size={16} aria-hidden="true" />
}

function batteryTone(pct) {
  if (pct === null) return 'text-stone-400'
  if (pct < 20) return 'text-red-600'
  return 'text-stone-700'
}

/** The paddy's position (sent by its sensor node) on an embedded Google satellite map. */
function PaddyMap({ paddy }) {
  const { t } = usePreferences()
  const { latitude: lat, longitude: lon } = paddy
  if (lat == null || lon == null) {
    return (
      <div className="flex min-h-44 items-center justify-center rounded-xl bg-stone-50 p-3 text-center text-xs text-stone-500">
        <span className="flex flex-col items-center gap-1">
          <MapPin size={20} aria-hidden="true" />
          {t('dashboard.mapPending')}
        </span>
      </div>
    )
  }
  const q = `${lat},${lon}`
  return (
    <div className="flex min-h-44 flex-col overflow-hidden rounded-xl bg-stone-50">
      <iframe
        title={t('dashboard.mapTitle', { name: paddy.paddy_name })}
        src={`https://maps.google.com/maps?q=${q}&t=k&z=17&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full flex-1 border-0"
      />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${q}`}
        target="_blank"
        rel="noreferrer"
        className="px-3 py-1.5 text-xs text-green-800 underline"
      >
        {t('dashboard.openMap')}
      </a>
    </div>
  )
}

/** Asks before deleting a paddy and everything recorded for it. */
function DeletePaddy({ paddy, onDeleted, onCancel }) {
  const { t } = usePreferences()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await api(`/paddies/${paddy.paddy_id}`, { method: 'DELETE' })
      onDeleted()
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-700">{t('dashboard.deleteConfirm', { name: paddy.paddy_name })}</p>
      <ErrorBox error={error} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t('dashboard.deleteCancel')}
        </Button>
        <Button variant="danger" onClick={remove} disabled={busy}>
          {busy ? t('common.saving') : t('dashboard.deleteYes')}
        </Button>
      </div>
    </div>
  )
}

/** A farm in progress: water level, sensor, GPS position, and buttons for its crop. */
function PaddyCard({ paddy, onChanged }) {
  const { t, fmt } = usePreferences()
  const [record, setRecord] = useState(null) // 'fertilizer' | 'harvest' | 'delete' | null
  const { calendar, latest } = paddy
  const level = latest ? Number(latest.level) : undefined
  // What the record forms need from the crop
  const crop = { ...calendar, paddy: { area_rai: paddy.area_rai } }
  const saved = () => {
    setRecord(null)
    onChanged()
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-stone-900">{paddy.paddy_name}</h2>
        {paddy.can_edit && (
          <button
            type="button"
            onClick={() => setRecord('delete')}
            title={t('dashboard.delete')}
            aria-label={t('dashboard.delete')}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3 rounded-xl bg-stone-50 p-3">
          <div>
            <p className="text-xs text-stone-500">{t('dashboard.latestLevel')}</p>
            <p className={`text-3xl font-semibold tabular-nums ${levelTone(level)}`}>
              {latest ? fmt.num(level, 1) : '–'}
              <span className="ml-1 text-sm font-normal text-stone-500">{t('common.cm')}</span>
            </p>
            <p className="text-xs text-stone-500">
              {latest ? fmt.dateTime(latest.t) : t('dashboard.noSensorData')}
            </p>
          </div>
          <dl className="space-y-2 text-sm">
            {paddy.devices.map((d) => (
              <div key={d.device_id}>
                <dt className="text-xs text-stone-500">{t('dashboard.device')}</dt>
                <dd className="font-medium tabular-nums text-stone-800">{d.device_id}</dd>
                <dd className={`flex items-center gap-1 tabular-nums ${batteryTone(d.battery_pct)}`}>
                  <BatteryIcon pct={d.battery_pct} />
                  {d.battery_pct !== null ? `${d.battery_pct}%` : t('common.unknown')}
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-xs text-stone-500">{t('dashboard.gps')}</dt>
              <dd className="tabular-nums text-stone-800">
                {paddy.latitude != null ? `${fmt.num(paddy.latitude, 5)}, ${fmt.num(paddy.longitude, 5)}` : t('common.unknown')}
              </dd>
            </div>
          </dl>
        </div>
        <PaddyMap paddy={paddy} />
      </div>

      <div>
        <p className="mb-1 text-xs text-stone-500">{t('dashboard.week')}</p>
        <ScrollWaterChart series={paddy.history} />
      </div>

      {paddy.can_edit && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setRecord('fertilizer')}>
              <Plus size={16} aria-hidden="true" />
              {t('dashboard.addFertilizer')}
            </Button>
            <Button variant="secondary" onClick={() => setRecord('harvest')}>
              <Wheat size={16} aria-hidden="true" />
              {t('dashboard.harvest')}
            </Button>
          </div>
          <Modal open={record === 'fertilizer'} onClose={() => setRecord(null)} title={`${t('records.fertilizer')} · ${paddy.paddy_name}`}>
            <FertilizerForm calendar={crop} reload={saved} />
          </Modal>
          <Modal open={record === 'harvest'} onClose={() => setRecord(null)} title={`${t('records.harvest')} · ${paddy.paddy_name}`}>
            {/* Once saved the crop is finished: the card leaves this page and the crop moves to History */}
            <HarvestForm calendar={crop} reload={saved} />
          </Modal>
          <Modal open={record === 'delete'} onClose={() => setRecord(null)} title={t('dashboard.deleteTitle')}>
            <DeletePaddy paddy={paddy} onDeleted={saved} onCancel={() => setRecord(null)} />
          </Modal>
        </>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = usePreferences()
  const { data, error, loading, reload } = useApi('/dashboard')
  const [adding, setAdding] = useState(false)

  return (
    <>
      <PageTitle
        title={user.role === 'farmer' ? t('dashboard.greeting', { name: user.display_name }) : t('dashboard.allPaddies')}
        subtitle={t('dashboard.subtitle')}
        action={
          user.role !== 'verifier' && (
            <Button onClick={() => setAdding(true)}>{t('dashboard.addPaddy')}</Button>
          )
        }
      />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && data.paddies.length === 0 && <Empty>{t('dashboard.empty')}</Empty>}
      <div className="space-y-4">
        {data?.paddies.map((p) => (
          <PaddyCard key={p.paddy_id} paddy={p} onChanged={reload} />
        ))}
      </div>
      <NewPaddyDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => {
          setAdding(false)
          reload() // the new paddy appears in the list
        }}
      />
    </>
  )
}
