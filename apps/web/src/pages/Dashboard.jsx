import { Link } from 'react-router'
import { useApi } from '../api.js'
import { useAuth } from '../auth.jsx'
import WaterChart from '../components/WaterChart.jsx'
import { Badge, Card, Empty, ErrorBox, Loading, PageTitle, PHASE_COLOR } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

function levelTone(level) {
  if (level === undefined) return 'text-stone-400'
  if (level <= -15) return 'text-red-600'
  if (level < 0) return 'text-amber-600'
  return 'text-sky-700'
}

function PaddyCard({ paddy }) {
  const { t, fmt } = usePreferences()
  const { calendar, phase, latest, alerts } = paddy
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link to={`/paddies/${paddy.paddy_id}`} className="font-semibold text-stone-900 hover:text-green-800">
            {paddy.paddy_name}
          </Link>
          <p className="text-xs text-stone-500">
            {t('common.rai', { n: fmt.num(paddy.area_rai) })} · {paddy.district}, {paddy.province} ·{' '}
            {t('dashboard.completed', { n: paddy.completed_calendars })}
          </p>
        </div>
        {phase && (
          <span className="text-right">
            <Badge color={PHASE_COLOR[phase.phase_type]}>{t(`phase.${phase.phase_type}`)}</Badge>
            <span className="block text-xs text-stone-500">{t('common.days', { n: phase.days })}</span>
          </span>
        )}
      </div>

      {calendar ? (
        <Link to={`/calendars/${calendar.calendar_id}`} className="block rounded-xl bg-stone-50 p-3 hover:bg-stone-100">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-stone-500">{t('dashboard.latestLevel')}</p>
              <p className={`text-3xl font-semibold tabular-nums ${levelTone(latest?.level)}`}>
                {latest ? fmt.num(latest.level, 1) : '–'}
                <span className="ml-1 text-sm font-normal text-stone-500">{t('common.cm')}</span>
              </p>
              <p className="text-xs text-stone-500">
                {latest ? t('dashboard.fromSensor', { time: fmt.dateTime(latest.t) }) : t('dashboard.noSensorData')}
              </p>
            </div>
            <div className="text-right text-xs text-stone-500">
              <p className="font-medium text-stone-700">{fmt.season(calendar)}</p>
              <p>{calendar.rice_variety}</p>
              <p>{t('dashboard.planted', { date: fmt.date(calendar.planting_date) })}</p>
              <p>{t('dashboard.stage', { stage: fmt.stage(calendar.stage.stage_no) })}</p>
              {paddy.battery_pct !== null && <p>🔋 {paddy.battery_pct}%</p>}
            </div>
          </div>
          {paddy.sparkline.length > 1 && (
            <div className="mt-2">
              <WaterChart series={paddy.sparkline} compact />
            </div>
          )}
        </Link>
      ) : (
        <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-500">
          {t('dashboard.noCrop')} ·{' '}
          <Link to={`/paddies/${paddy.paddy_id}`} className="text-green-800 underline">
            {t('dashboard.startNew')}
          </Link>
        </p>
      )}

      {alerts.length > 0 && (
        <ul className="space-y-1">
          {alerts.map((a) => (
            <li
              key={`${a.code}-${a.params.device ?? ''}`}
              className={`rounded-lg px-3 py-2 text-sm ${a.level === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-stone-100 text-stone-700'}`}
            >
              {a.level === 'warn' ? '⚠️ ' : 'ℹ️ '}
              {t(`alerts.${a.code}`, a.params)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = usePreferences()
  const { data, error, loading } = useApi('/dashboard')

  return (
    <>
      <PageTitle
        title={user.role === 'farmer' ? t('dashboard.greeting', { name: user.display_name }) : t('dashboard.allPaddies')}
        subtitle={t('dashboard.subtitle')}
        action={
          user.role !== 'verifier' && (
            <Link
              to="/paddies/new"
              className="rounded-xl bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              {t('dashboard.addPaddy')}
            </Link>
          )
        }
      />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && data.paddies.length === 0 && <Empty>{t('dashboard.empty')}</Empty>}
      <div className="space-y-4">
        {data?.paddies.map((p) => (
          <PaddyCard key={p.paddy_id} paddy={p} />
        ))}
      </div>
    </>
  )
}
