import { Link } from 'react-router'
import { useApi } from '../api.js'
import { useAuth } from '../auth.jsx'
import WaterChart from '../components/WaterChart.jsx'
import { Badge, Card, Empty, ErrorBox, Loading, PageTitle, PHASE_COLOR } from '../components/ui.jsx'
import { fmtDate, fmtDateTime, fmtNum, PHASE_LABEL } from '../format.js'

function levelTone(level) {
  if (level === undefined) return 'text-stone-400'
  if (level <= -15) return 'text-red-600'
  if (level < 0) return 'text-amber-600'
  return 'text-sky-700'
}

function PlotCard({ plot }) {
  const { cycle, phase, latest, alerts } = plot
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link to={`/plots/${plot.plot_id}`} className="font-semibold text-stone-900 hover:text-green-800">
            {plot.plot_name}
          </Link>
          <p className="text-xs text-stone-500">
            {fmtNum(plot.area_rai)} ไร่ · {plot.district}, {plot.province} · ทำนาแล้ว {plot.completed_cycles} รอบ
          </p>
        </div>
        {phase && (
          <span className="text-right">
            <Badge color={PHASE_COLOR[phase.phase_type]}>{PHASE_LABEL[phase.phase_type]}</Badge>
            <span className="block text-xs text-stone-500">{phase.days} วัน</span>
          </span>
        )}
      </div>

      {cycle ? (
        <Link to={`/cycles/${cycle.cycle_id}`} className="block rounded-xl bg-stone-50 p-3 hover:bg-stone-100">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-stone-500">ระดับน้ำล่าสุด</p>
              <p className={`text-3xl font-semibold tabular-nums ${levelTone(latest?.level)}`}>
                {latest ? fmtNum(latest.level, 1) : '–'}
                <span className="ml-1 text-sm font-normal text-stone-500">ซม.</span>
              </p>
              <p className="text-xs text-stone-500">
{latest ? `เซ็นเซอร์ · ${fmtDateTime(latest.t)}` : 'ยังไม่มีข้อมูลจากเซ็นเซอร์'}
              </p>
            </div>
            <div className="text-right text-xs text-stone-500">
              <p className="font-medium text-stone-700">{cycle.cycle_name}</p>
              <p>{cycle.rice_variety}</p>
              <p>เริ่ม {fmtDate(cycle.start_date)}</p>
              {plot.battery_pct !== null && <p>🔋 {plot.battery_pct}%</p>}
            </div>
          </div>
          {plot.sparkline.length > 1 && (
            <div className="mt-2">
              <WaterChart series={plot.sparkline} compact />
            </div>
          )}
        </Link>
      ) : (
        <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-500">
          ไม่มีรอบที่กำลังปลูก ·{' '}
          <Link to={`/plots/${plot.plot_id}`} className="text-green-800 underline">
            เริ่มรอบใหม่
          </Link>
        </p>
      )}

      {alerts.length > 0 && (
        <ul className="space-y-1">
          {alerts.map((a) => (
            <li
              key={a.code}
              className={`rounded-lg px-3 py-2 text-sm ${a.level === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-stone-100 text-stone-700'}`}
            >
              {a.level === 'warn' ? '⚠️ ' : 'ℹ️ '}
              {a.message}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, error, loading } = useApi('/dashboard')

  return (
    <>
      <PageTitle
        title={user.role === 'farmer' ? `สวัสดี ${user.display_name}` : 'แปลงนาทั้งหมด'}
        subtitle="ติดตามน้ำในนาแบบเปียกสลับแห้ง"
        action={
          user.role !== 'verifier' && (
            <Link
              to="/plots/new"
              className="rounded-xl bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              + เพิ่มแปลง
            </Link>
          )
        }
      />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && data.plots.length === 0 && <Empty>ยังไม่มีแปลงนา กด “เพิ่มแปลง” เพื่อเริ่มต้น</Empty>}
      <div className="space-y-4">
        {data?.plots.map((p) => (
          <PlotCard key={p.plot_id} plot={p} />
        ))}
      </div>
    </>
  )
}
