import { useState } from 'react'
import { Link } from 'react-router'
import { api, useApi } from '../api.js'
import { Badge, Button, Card, CREDIT_COLOR, Empty, ErrorBox, inputClass, Loading, PageTitle } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

const FILTERS = ['', 'not_checked', 'passed', 'failed']

function Request({ c, reload }) {
  const { t, fmt } = usePreferences()
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function decide(status) {
    setBusy(true)
    setError(null)
    try {
      await api(`/credits/${c.credit_id}/decide`, { method: 'POST', body: { status, comment: comment || null } })
      reload()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {c.paddy_name} · {fmt.season(c)}
          </p>
          <p className="text-xs text-stone-500">
            {[c.farmer_name, t('common.rai', { n: fmt.num(c.area_rai) }), [c.district, c.province].filter(Boolean).join(', ')]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="text-xs text-stone-500">
            {c.rice_variety && `${c.rice_variety} · `}
            {fmt.date(c.planting_date)} – {fmt.date(c.harvest_date)} ·{' '}
            {t('verify.submittedOn', { date: fmt.date(c.submitted_at) })}
          </p>
          {c.harvest_kg != null && <p className="text-xs text-stone-500">{t('records.harvestSummary', { kg: fmt.num(c.harvest_kg, 0), perRai: fmt.num(c.yield_kg_per_rai, 0) })}</p>}
        </div>
        <Badge color={CREDIT_COLOR[c.credit_status]}>{t(`creditStatus.${c.credit_status}`)}</Badge>
      </div>

      <p className="text-sm">
        {t('verify.requested')} <strong className="text-green-700">{fmt.num(c.credit_tco2e)} tCO₂e</strong>
      </p>
      {c.verifier_name && (
        <p className="text-xs text-stone-500">{t('verify.checkedBy', { name: c.verifier_name, time: fmt.dateTime(c.verified_at) })}</p>
      )}
      {c.verify_comment && <p className="text-sm text-stone-700">“{c.verify_comment}”</p>}

      <Link to={`/calendars/${c.calendar_id}`} className="inline-block text-sm text-green-800 underline">
        {t('verify.evidence')}
      </Link>

      {c.credit_status === 'not_checked' && (
        <div className="space-y-2 border-t border-stone-100 pt-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder={t('verify.commentPlaceholder')}
            className={inputClass}
          />
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => decide('passed')}>
              {t('verify.pass')}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => decide('failed')}>
              {t('verify.fail')}
            </Button>
          </div>
          <ErrorBox error={error} />
        </div>
      )}
    </Card>
  )
}

export default function VerifyQueue() {
  const { t } = usePreferences()
  const [status, setStatus] = useState('')
  const { data, error, loading, reload } = useApi(`/credits${status ? `?status=${status}` : ''}`)

  return (
    <>
      <PageTitle title={t('verify.title')} subtitle={t('verify.subtitle')} />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatus(f)}
            className={`rounded-full px-3 py-1 text-sm ${status === f ? 'bg-green-700 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300'}`}
          >
            {f ? t(`creditStatus.${f}`) : t('verify.all')}
          </button>
        ))}
      </div>
      {loading && !data && <Loading />}
      <ErrorBox error={error} />
      {data?.length === 0 && <Empty>{t('verify.empty')}</Empty>}
      <div className="space-y-3">
        {data?.map((c) => (
          <Request key={c.credit_id} c={c} reload={reload} />
        ))}
      </div>
    </>
  )
}
