import { Link } from 'react-router'
import { useApi } from '../api.js'
import { Card, Empty, ErrorBox, Loading, PageTitle } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

export default function Reports() {
  const { t, fmt } = usePreferences()
  const { data, error, loading } = useApi('/reports')

  return (
    <>
      <PageTitle title={t('reports.title')} subtitle={t('reports.subtitle')} />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data?.length === 0 && <Empty>{t('reports.empty')}</Empty>}
      <div className="space-y-3">
        {data?.map((r) => (
          <Link key={r.credit_id} to={`/reports/${r.credit_id}`} className="block">
            <Card className="flex items-center justify-between gap-3 hover:border-green-600">
              <div>
                <p className="font-medium">{r.report_no}</p>
                <p className="text-sm text-stone-600">
                  {r.paddy_name} · {fmt.season(r)}
                </p>
                <p className="text-xs text-stone-500">{t('reports.verifiedOn', { date: fmt.date(r.verified_at) })}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-700 tabular-nums">{fmt.num(r.credit_tco2e)} tCO₂e</p>
                <p className="text-xs text-stone-500">{fmt.baht(r.amount_thb)}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
