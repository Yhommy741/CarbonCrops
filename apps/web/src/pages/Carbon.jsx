import { useState } from 'react'
import { Link } from 'react-router'
import { useApi } from '../api.js'
import { Badge, Card, CREDIT_COLOR, Empty, ErrorBox, Field, inputClass, Loading, PageTitle, Stat } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

export default function Carbon() {
  const { t, fmt } = usePreferences()
  const { data, error, loading } = useApi('/carbon/summary')
  const [price, setPrice] = useState(null)

  if (loading) return <Loading />
  if (error) return <ErrorBox error={error} />

  const unitPrice = price ?? data.price_thb_per_tco2e
  const { verified_tco2e, pending_tco2e, estimated_tco2e, earned_thb } = data.totals

  return (
    <div className="space-y-4">
      <PageTitle title={t('carbon.title')} subtitle={t('carbon.subtitle')} />

      <Card className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label={t('carbon.verified')} value={fmt.num(verified_tco2e)} unit="tCO₂e" tone="text-green-700" />
          <Stat label={t('carbon.pending')} value={fmt.num(pending_tco2e)} unit="tCO₂e" tone="text-violet-700" />
          <Stat label={t('carbon.notSubmitted')} value={fmt.num(estimated_tco2e)} unit="tCO₂e" tone="text-stone-600" />
        </div>
        <div className="rounded-xl bg-green-50 p-4">
          <p className="text-sm text-green-900">{t('carbon.earned')}</p>
          <p className="text-3xl font-semibold text-green-800 tabular-nums">{fmt.baht(earned_thb)}</p>
          <p className="text-xs text-green-900/70">
            {t('carbon.projection', { amount: fmt.baht(earned_thb + (pending_tco2e + estimated_tco2e) * unitPrice) })}
          </p>
        </div>
        <Field label={t('carbon.price')} hint={t('carbon.priceHint')}>
          <input
            type="number"
            min="0"
            step="10"
            value={unitPrice}
            onChange={(e) => setPrice(e.target.value === '' ? 0 : Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">{t('carbon.byCrop')}</h2>
        {data.calendars.length === 0 && <Empty>{t('carbon.noCrops')}</Empty>}
        <ul className="divide-y divide-stone-100">
          {data.calendars.map((c) => {
            const tco2e = c.credit_tco2e ?? c.estimated_tco2e
            return (
              <li key={c.calendar_id}>
                <Link to={`/calendars/${c.calendar_id}`} className="flex items-center justify-between gap-3 py-3 hover:text-green-800">
                  <span>
                    <span className="block font-medium">
                      {c.paddy_name} · {fmt.season(c)}
                    </span>
                    <span className="text-xs text-stone-500">
                      {fmt.date(c.planting_date)} – {c.harvest_date ? fmt.date(c.harvest_date) : t('common.present')}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">{tco2e === null ? '–' : `${fmt.num(tco2e)} t`}</span>
                    {c.credit_status ? (
                      <Badge color={CREDIT_COLOR[c.credit_status]}>{t(`creditStatus.${c.credit_status}`)}</Badge>
                    ) : (
                      <Badge>{c.status === 'harvested' ? t('carbon.notSubmitted') : t(`calendarStatus.${c.status}`)}</Badge>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
