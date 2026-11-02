import { useApi } from '../api.js'
import { Badge, Card, Empty, ErrorBox, Loading, PageTitle } from '../components/ui.jsx'
import { fmtDateTime } from '../format.js'

const TYPE_ICON = { phase_reminder: '💧', verification_result: '✅', low_battery: '🔋' }
const STATUS = { pending: ['stone', 'รอส่ง LINE'], sent: ['green', 'ส่ง LINE แล้ว'], failed: ['red', 'ส่งไม่สำเร็จ'] }

export default function Notifications() {
  const { data, error, loading } = useApi('/notifications')

  return (
    <>
      <PageTitle title="การแจ้งเตือน" />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data?.length === 0 && <Empty>ไม่มีการแจ้งเตือน</Empty>}
      <div className="space-y-2">
        {data?.map((n) => {
          const [color, label] = STATUS[n.status]
          return (
            <Card key={n.notification_id} className="flex gap-3">
              <span aria-hidden="true" className="text-xl">
                {TYPE_ICON[n.notif_type] ?? '🔔'}
              </span>
              <div className="flex-1">
                <p className="text-sm text-stone-900">{n.message}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                  {fmtDateTime(n.created_at)} <Badge color={color}>{label}</Badge>
                </p>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
