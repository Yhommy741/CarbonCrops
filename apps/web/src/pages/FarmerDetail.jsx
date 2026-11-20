import { Link, useParams } from 'react-router'
import { useApi } from '../api.js'
import { Badge, CALENDAR_COLOR, Card, CREDIT_COLOR, Empty, ErrorBox, Loading, PageTitle } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

function CalendarRow({ c }) {
  const { t, fmt } = usePreferences()
  return (
    <li>
      <Link to={`/calendars/${c.calendar_id}`} className="flex items-center justify-between gap-3 py-2 hover:text-green-800">
        <span>
          <span className="block text-sm font-medium">{fmt.season(c)}</span>
          <span className="text-xs text-stone-500">
            {c.rice_variety} · {fmt.date(c.planting_date)} – {c.harvest_date ? fmt.date(c.harvest_date) : t('common.present')}
          </span>
        </span>
        <span className="text-right">
          <Badge color={CALENDAR_COLOR[c.status]}>{t(`calendarStatus.${c.status}`)}</Badge>
          {c.credit_status && (
            <span className="mt-1 block">
              <Badge color={CREDIT_COLOR[c.credit_status]}>
                {t(`creditStatus.${c.credit_status}`)} {fmt.num(c.credit_tco2e)} t
              </Badge>
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}

export default function FarmerDetail() {
  const { userId } = useParams()
  const { t, fmt } = usePreferences()
  const { data: farmer, error, loading } = useApi(`/farmers/${userId}`)

  if (loading) return <Loading />
  if (error) return <ErrorBox error={error} />

  const totalRai = farmer.paddies.reduce((sum, p) => sum + Number(p.area_rai), 0)

  return (
    <div className="space-y-4">
      <Link to="/farmers" className="text-sm text-stone-500 hover:text-green-800">
        {t('farmers.back')}
      </Link>
      <PageTitle title={farmer.display_name} subtitle={[farmer.district, farmer.province].filter(Boolean).join(', ')} />

      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-stone-500">{t('farmers.phone')}</dt>
            <dd>{farmer.phone || '-'}</dd>
          </div>
          <div>
            <dt className="text-stone-500">{t('farmers.totalArea')}</dt>
            <dd>
              {t('farmers.area', { n: fmt.num(totalRai) })} · {t('farmers.paddies', { n: farmer.paddies.length })}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-stone-500">{t('farmers.address')}</dt>
            <dd>{farmer.address || '-'}</dd>
          </div>
        </dl>
      </Card>

      <h2 className="font-semibold">{t('farmers.history')}</h2>
      {farmer.paddies.length === 0 && <Empty>{t('farmers.noPaddies')}</Empty>}
      {farmer.paddies.map((p) => (
        <Card key={p.paddy_id}>
          <div className="mb-1 flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{p.paddy_name}</p>
              <p className="text-xs text-stone-500">
                {t('common.rai', { n: fmt.num(p.area_rai) })} · {[p.subdistrict, p.district, p.province].filter(Boolean).join(', ')}
              </p>
            </div>
            <Link to={`/paddies/${p.paddy_id}`} className="whitespace-nowrap text-xs text-green-800 underline">
              {t('farmers.openPaddy')}
            </Link>
          </div>
          {p.calendars.length === 0 ? (
            <Empty>{t('farmers.noCrops')}</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {p.calendars.map((c) => (
                <CalendarRow key={c.calendar_id} c={c} />
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  )
}
