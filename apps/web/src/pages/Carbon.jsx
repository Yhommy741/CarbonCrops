import { useState } from 'react'
import { Link } from 'react-router'
import { useApi } from '../api.js'
import { Badge, Card, Empty, ErrorBox, Field, inputClass, Loading, PageTitle, Stat, VERIFICATION_COLOR } from '../components/ui.jsx'
import { fmtBaht, fmtDate, fmtNum, VERIFICATION_STATUS } from '../format.js'

export default function Carbon() {
  const { data, error, loading } = useApi('/carbon/summary')
  const [price, setPrice] = useState(null)

  if (loading) return <Loading />
  if (error) return <ErrorBox error={error} />

  const unitPrice = price ?? data.price_thb_per_tco2e
  const { verified_tco2e, pending_tco2e, estimated_tco2e } = data.totals

  return (
    <div className="space-y-4">
      <PageTitle title="คาร์บอนและรายได้" subtitle="ปริมาณก๊าซเรือนกระจกที่ลดได้จากการทำนาเปียกสลับแห้ง" />

      <Card className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="รับรองแล้ว" value={fmtNum(verified_tco2e)} unit="tCO₂e" tone="text-green-700" />
          <Stat label="รอตรวจสอบ" value={fmtNum(pending_tco2e)} unit="tCO₂e" tone="text-violet-700" />
          <Stat label="ประเมินเบื้องต้น" value={fmtNum(estimated_tco2e)} unit="tCO₂e" tone="text-stone-600" />
        </div>
        <div className="rounded-xl bg-green-50 p-4">
          <p className="text-sm text-green-900">รายได้โดยประมาณจากเครดิตที่รับรองแล้ว</p>
          <p className="text-3xl font-semibold text-green-800 tabular-nums">{fmtBaht(verified_tco2e * unitPrice)}</p>
          <p className="text-xs text-green-900/70">
            ถ้ารวมที่รอตรวจสอบ: {fmtBaht((verified_tco2e + pending_tco2e) * unitPrice)}
          </p>
        </div>
        <Field label="ราคาอ้างอิง (บาท / tCO₂e)" hint="ราคาจริงขึ้นกับผู้ซื้อและตลาด T-VER ตัวเลขนี้ใช้ประมาณการเท่านั้น">
          <input
            type="number"
            min="0"
            step="10"
            value={unitPrice}
            onChange={(e) => setPrice(e.target.value === '' ? 0 : Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">แยกตามรอบการปลูก</h2>
        {data.cycles.length === 0 && <Empty>ยังไม่มีรอบการปลูก</Empty>}
        <ul className="divide-y divide-stone-100">
          {data.cycles.map((c) => {
            const tco2e = c.verified_tco2e ?? c.estimated_tco2e
            return (
              <li key={c.cycle_id}>
                <Link to={`/cycles/${c.cycle_id}`} className="flex items-center justify-between gap-3 py-3 hover:text-green-800">
                  <span>
                    <span className="block font-medium">
                      {c.plot_name} · {c.cycle_name}
                    </span>
                    <span className="text-xs text-stone-500">
                      {fmtDate(c.start_date)} – {c.end_date ? fmtDate(c.end_date) : 'ปัจจุบัน'}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">
                      {tco2e === null ? '–' : `${fmtNum(tco2e)} t`}
                    </span>
                    {c.verified_tco2e !== null ? (
                      <Badge color="green">รับรองแล้ว</Badge>
                    ) : c.verification_status ? (
                      <Badge color={VERIFICATION_COLOR[c.verification_status]}>
                        {VERIFICATION_STATUS[c.verification_status]}
                      </Badge>
                    ) : (
                      <Badge>{c.estimated_tco2e === null ? 'ยังไม่คำนวณ' : 'ประเมิน'}</Badge>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
