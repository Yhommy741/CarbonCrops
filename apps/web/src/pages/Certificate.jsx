import { Link, useParams } from 'react-router'
import { useApi } from '../api.js'
import { Button, ErrorBox, Loading } from '../components/ui.jsx'
import { fmtDate, fmtNum } from '../format.js'

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-stone-100 py-2 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-stone-900">{children}</dd>
    </div>
  )
}

export default function Certificate() {
  const { reportId } = useParams()
  const { data: r, error, loading } = useApi(`/reports/${reportId}`)

  if (loading) return <Loading />
  if (error) return <ErrorBox error={error} />

  const certified = r.verification_status === 'approved'

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to="/reports" className="text-sm text-stone-500 hover:text-green-800">
          ← รายงานทั้งหมด
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          🖨️ พิมพ์ / บันทึก PDF
        </Button>
      </div>

      <article className="relative overflow-hidden rounded-2xl border-4 border-double border-green-700 bg-white p-6 sm:p-10">
        {!certified && (
          <p className="pointer-events-none absolute inset-0 flex -rotate-12 items-center justify-center text-6xl font-bold text-red-500/15">
            ร่าง – ยังไม่รับรอง
          </p>
        )}
        <header className="mb-6 text-center">
          <img src="/icon.svg" alt="" className="mx-auto mb-2 h-12 w-12" />
          <p className="text-sm tracking-wide text-stone-500">CarbonCrops · รายงานการลดก๊าซเรือนกระจก</p>
          <h1 className="text-2xl font-semibold text-green-800">ใบรับรองการลดก๊าซมีเทนจากนาข้าว</h1>
          <p className="text-sm text-stone-600">การทำนาแบบเปียกสลับแห้ง (Alternate Wetting and Drying)</p>
          <p className="mt-2 font-mono text-sm">เลขที่ {r.report_no}</p>
        </header>

        <div className="mb-6 text-center">
          <p className="text-sm text-stone-500">ปริมาณก๊าซเรือนกระจกที่ลดได้</p>
          <p className="text-5xl font-semibold text-green-700 tabular-nums">{fmtNum(r.reduction_tco2e)}</p>
          <p className="text-stone-600">ตันคาร์บอนไดออกไซด์เทียบเท่า (tCO₂e)</p>
        </div>

        <dl>
          <Row label="เกษตรกร">{r.farmer_name}</Row>
          <Row label="แปลง">
            {r.plot_name} ({fmtNum(r.area_rai)} ไร่) · {[r.subdistrict, r.district, r.province].filter(Boolean).join(', ')}
          </Row>
          <Row label="พิกัด">{r.latitude ? `${r.latitude}, ${r.longitude}` : '-'}</Row>
          <Row label="เอกสารสิทธิ์">{r.land_doc_no || '-'}</Row>
          <Row label="รอบการปลูก">
            {r.cycle_name} · {r.rice_variety} · {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
          </Row>
          <Row label="วิธีคำนวณ">{r.method_version}</Row>
          <Row label="กรณีฐาน / โครงการ">
            {fmtNum(r.baseline_tco2e)} / {fmtNum(r.project_tco2e)} tCO₂e
          </Row>
          <Row label="ผลการตรวจสอบ">
            {certified
              ? `รับรองโดย ${r.verifier_name ?? '-'} เมื่อ ${fmtDate(r.decided_at)}`
              : 'ยังไม่ผ่านการรับรอง'}
          </Row>
          {r.verification_comment && <Row label="ความเห็นผู้ตรวจ">{r.verification_comment}</Row>}
          <Row label="วันที่ออกรายงาน">{fmtDate(r.generated_at)}</Row>
        </dl>
      </article>
    </>
  )
}
