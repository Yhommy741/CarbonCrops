import { Link, useParams } from 'react-router'
import { useApi } from '../api.js'
import { Button, ErrorBox, Loading } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-stone-100 py-2 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-stone-900">{children}</dd>
    </div>
  )
}

export default function Certificate() {
  const { creditId } = useParams()
  const { t, fmt } = usePreferences()
  const { data: r, error, loading } = useApi(`/reports/${creditId}`)

  if (loading) return <Loading />
  if (error) return <ErrorBox error={error} />

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to="/reports" className="text-sm text-stone-500 hover:text-green-800">
          {t('certificate.back')}
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          {t('certificate.print')}
        </Button>
      </div>

      <article className="relative overflow-hidden rounded-2xl border-4 border-double border-green-700 bg-white p-6 sm:p-10">
        <header className="mb-6 text-center">
          <img src="/icon.svg" alt="" className="mx-auto mb-2 h-12 w-12" />
          <p className="text-sm tracking-wide text-stone-500">{t('certificate.brand')}</p>
          <h1 className="text-2xl font-semibold text-green-800">{t('certificate.title')}</h1>
          <p className="text-sm text-stone-600">{t('certificate.subtitle')}</p>
          <p className="mt-2 font-mono text-sm">{t('certificate.number', { no: r.report_no })}</p>
        </header>

        <div className="mb-6 text-center">
          <p className="text-sm text-stone-500">{t('certificate.reducedLabel')}</p>
          <p className="text-5xl font-semibold text-green-700 tabular-nums">{fmt.num(r.credit_tco2e)}</p>
          <p className="text-stone-600">{t('certificate.unit')}</p>
          <p className="mt-1 text-sm text-stone-600">{t('certificate.value', { amount: fmt.baht(r.amount_thb) })}</p>
        </div>

        <dl>
          <Row label={t('certificate.farmer')}>{r.farmer_name}</Row>
          <Row label={t('certificate.paddy')}>
            {r.paddy_name} ({t('common.rai', { n: fmt.num(r.area_rai) })}) ·{' '}
            {[r.subdistrict, r.district, r.province].filter(Boolean).join(', ')}
          </Row>
          <Row label={t('certificate.location')}>{r.latitude ? `${r.latitude}, ${r.longitude}` : '-'}</Row>
          <Row label={t('certificate.deed')}>{r.land_doc_no || '-'}</Row>
          <Row label={t('certificate.crop')}>
            {fmt.season(r)} · {r.rice_variety} · {fmt.date(r.planting_date)} – {fmt.date(r.harvest_date)}
          </Row>
          <Row label={t('certificate.method')}>{t('certificate.methodValue')}</Row>
          <Row label={t('certificate.result')}>
            {t('certificate.resultValue', { name: r.verifier_name ?? '-', date: fmt.date(r.verified_at) })}
          </Row>
          {r.verify_comment && <Row label={t('certificate.comment')}>{r.verify_comment}</Row>}
          <Row label={t('certificate.submitted')}>{fmt.date(r.submitted_at)}</Row>
        </dl>
      </article>
    </>
  )
}
