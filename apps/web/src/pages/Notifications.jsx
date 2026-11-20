import { useApi } from '../api.js'
import { Badge, Card, Empty, ErrorBox, Loading, PageTitle } from '../components/ui.jsx'
import { usePreferences } from '../preferences.jsx'

const TYPE_ICON = { phase_reminder: '💧', water_level_alert: '💧', verification_result: '✅', low_battery: '🔋' }
const STATUS_COLOR = { pending: 'stone', sent: 'green', failed: 'red' }

export default function Notifications() {
  const { t, fmt } = usePreferences()
  const { data, error, loading } = useApi('/notifications')

  return (
    <>
      <PageTitle title={t('notifications.title')} />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data?.length === 0 && <Empty>{t('notifications.empty')}</Empty>}
      <div className="space-y-2">
        {data?.map((n) => (
          <Card key={n.notification_id} className="flex gap-3">
            <span aria-hidden="true" className="text-xl">
              {TYPE_ICON[n.notif_type] ?? '🔔'}
            </span>
            <div className="flex-1">
              <p className="text-sm text-stone-900">{n.message}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                {fmt.dateTime(n.created_at)}{' '}
                <Badge color={STATUS_COLOR[n.status]}>{t(`notifications.status.${n.status}`)}</Badge>
              </p>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
