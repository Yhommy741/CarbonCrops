import { Link } from 'react-router'
import { useApi } from '../api.js'
import { Badge, Card, Empty, ErrorBox, Loading, PageTitle, VERIFICATION_COLOR } from '../components/ui.jsx'
import { fmtDate, fmtNum, VERIFICATION_STATUS } from '../format.js'

export default function Reports() {
  const { data, error, loading } = useApi('/reports')

  return (
    <>
      <PageTitle title="รายงาน MRV และใบรับรอง" subtitle="ออกให้อัตโนมัติเมื่อผู้ตรวจสอบรับรองผล" />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data?.length === 0 && <Empty>ยังไม่มีรายงาน</Empty>}
      <div className="space-y-3">
        {data?.map((r) => (
          <Link key={r.report_id} to={`/reports/${r.report_id}`} className="block">
            <Card className="flex items-center justify-between gap-3 hover:border-green-600">
              <div>
                <p className="font-medium">{r.report_no}</p>
                <p className="text-sm text-stone-600">
                  {r.plot_name} · {r.cycle_name}
                </p>
                <p className="text-xs text-stone-500">ออกเมื่อ {fmtDate(r.generated_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-700 tabular-nums">{fmtNum(r.reduction_tco2e)} tCO₂e</p>
                <Badge color={VERIFICATION_COLOR[r.verification_status] ?? 'stone'}>
                  {VERIFICATION_STATUS[r.verification_status] ?? 'ยังไม่ตรวจสอบ'}
                </Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
