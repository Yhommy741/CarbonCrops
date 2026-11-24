import { useState } from 'react'
import { Link } from 'react-router'
import { useApi } from '../api.js'
import { Badge, Card, Empty, ErrorBox, inputClass, Loading, PageTitle } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

export default function Farmers() {
  const { t, fmt } = usePreferences()
  const { data, error, loading } = useApi('/farmers')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const farmers = (data ?? []).filter(
    (f) => !q || [f.display_name, f.province, f.district].some((v) => v?.toLowerCase().includes(q)),
  )

  return (
    <>
      <PageTitle title={t('farmers.title')} subtitle={t('farmers.subtitle')} />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('farmers.search')}
        className={`${inputClass} mb-4`}
      />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && farmers.length === 0 && <Empty>{t('farmers.empty')}</Empty>}
      <div className="space-y-3">
        {farmers.map((f) => (
          <Link key={f.user_id} to={`/farmers/${f.user_id}`} className="block">
            <Card className="flex items-center justify-between gap-3 hover:border-green-600">
              <div>
                <p className="font-medium">{f.display_name}</p>
                <p className="text-xs text-stone-500">{[f.district, f.province].filter(Boolean).join(', ')}</p>
                <p className="text-xs text-stone-500">
                  {t('farmers.paddies', { n: f.paddies })} · {t('farmers.area', { n: fmt.num(f.area_rai) })} ·{' '}
                  {t('farmers.crops', { n: f.calendars, done: f.completed })}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm font-semibold text-green-700 tabular-nums">
                  {t('farmers.verified', { t: fmt.num(f.verified_tco2e) })}
                </p>
                {f.pending > 0 && <Badge color="violet">{t('farmers.pending', { n: f.pending })}</Badge>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
