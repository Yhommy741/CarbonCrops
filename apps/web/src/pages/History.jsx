import { ArrowUpDown, FileText, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useApi } from '../api.js'
import { Badge, Card, CREDIT_COLOR, Empty, ErrorBox, inputClass, Loading, PageTitle } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

// Date orders; harvest dates are YYYY-MM-DD strings, so they compare as text.
// The name order needs the language, so it's in the component.
const SORTS = {
  newest: (a, b) => b.harvest_date.localeCompare(a.harvest_date),
  oldest: (a, b) => a.harvest_date.localeCompare(b.harvest_date),
}
// Credit status filter: '' = all; otherwise Pending / Approved / Disapproved
const STATUSES = ['', 'not_checked', 'passed', 'failed']

/** Finished farms: every harvested crop with its carbon credit and certificate, searchable and sortable. */
export default function History() {
  const { lang, t, fmt } = usePreferences()
  const { data, error, loading } = useApi('/history')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [status, setStatus] = useState('')

  // Matches what the card shows, in the current language: paddy, season, variety, status, dates
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const matches = (data ?? []).filter((c) => {
    if (words.length === 0) return true
    const text = [
      c.paddy_name,
      fmt.season(c),
      c.rice_variety,
      c.credit_status && t(`creditStatus.${c.credit_status}`),
      fmt.date(c.planting_date),
      fmt.date(c.harvest_date),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return words.every((w) => text.includes(w))
  })
  // Counts on the filter buttons are for the search results, so they add up to what you'd see
  const count = (s) => (s ? matches.filter((c) => c.credit_status === s).length : matches.length)
  const crops = status ? matches.filter((c) => c.credit_status === status) : matches
  // Name order follows the language (Thai names in Thai order); same name -> newest first
  const byName = (a, b) => a.paddy_name.localeCompare(b.paddy_name, lang) || SORTS.newest(a, b)
  crops.sort(sort === 'name' ? byName : SORTS[sort])

  return (
    <>
      <PageTitle title={t('history.title')} subtitle={t('history.subtitle')} />
      {data?.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('history.search')}
              aria-label={t('history.search')}
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="relative sm:w-52">
            <ArrowUpDown size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t('history.sortLabel')} className={`${inputClass} pl-10`}>
              <option value="newest">{t('history.sortNewest')}</option>
              <option value="oldest">{t('history.sortOldest')}</option>
              <option value="name">{t('history.sortName')}</option>
            </select>
          </div>
        </div>
      )}
      {data?.length > 0 && (
        <div role="group" aria-label={t('history.filterLabel')} className="mb-4 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1 text-sm ${status === s ? 'bg-green-700 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100'}`}
            >
              {s ? t(`creditStatus.${s}`) : t('history.all')}
              <span className="ml-1.5 tabular-nums opacity-75">{count(s)}</span>
            </button>
          ))}
        </div>
      )}
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data?.length === 0 && <Empty>{t('history.empty')}</Empty>}
      {data?.length > 0 && crops.length === 0 && (
        <Empty>{query.trim() ? t('history.noResults', { query: query.trim() }) : t('history.noneWithStatus')}</Empty>
      )}
      <div className="space-y-3">
        {crops.map((c) => (
          <Card key={c.calendar_id} className="space-y-2">
            <Link to={`/calendars/${c.calendar_id}`} className="flex items-start justify-between gap-3 hover:text-green-800">
              <div>
                <p className="font-medium">{c.paddy_name}</p>
                <p className="text-sm text-stone-600">
                  {[fmt.season(c), c.rice_variety].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-stone-500">
                  {fmt.date(c.planting_date)} – {fmt.date(c.harvest_date)}
                </p>
                {c.harvest_kg != null && <p className="text-xs text-stone-600">{t('records.harvestSummary', { kg: fmt.num(c.harvest_kg, 0), perRai: fmt.num(c.yield_kg_per_rai, 0) })}</p>}
              </div>
              <div className="text-right">
                {/* Every harvested crop has a credit: Pending, Approved or Disapproved */}
                {c.credit_status && (
                  <>
                    <Badge color={CREDIT_COLOR[c.credit_status]}>{t(`creditStatus.${c.credit_status}`)}</Badge>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-green-700">{fmt.num(c.credit_tco2e)} tCO₂e</p>
                  </>
                )}
              </div>
            </Link>
            {c.credit_status === 'passed' && (
              <Link to={`/history/${c.credit_id}`} className="inline-flex items-center gap-1 text-sm text-green-800 underline">
                <FileText size={14} aria-hidden="true" />
                {t('history.certificate')}
              </Link>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}
