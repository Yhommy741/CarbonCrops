import { useState } from 'react'
import { Link } from 'react-router'
import { api, useApi } from '../api.js'
import { Badge, Button, Card, Empty, ErrorBox, inputClass, Loading, PageTitle, VERIFICATION_COLOR } from '../components/ui.jsx'
import { fmtDate, fmtNum, VERIFICATION_STATUS } from '../format.js'

const FILTERS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รอตรวจ' },
  { value: 'in_review', label: 'กำลังตรวจ' },
  { value: 'approved', label: 'รับรองแล้ว' },
  { value: 'rejected', label: 'ไม่ผ่าน' },
]

function Request({ v, reload }) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function act(path, body) {
    setBusy(true)
    setError(null)
    try {
      await api(`/verifications/${v.verification_id}/${path}`, { method: 'POST', body })
      reload()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const open = v.status === 'pending' || v.status === 'in_review'

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {v.plot_name} · {v.cycle_name}
          </p>
          <p className="text-xs text-stone-500">
            {v.farmer_name} · {fmtNum(v.area_rai)} ไร่ · {v.district}, {v.province}
          </p>
          <p className="text-xs text-stone-500">
            ส่งเมื่อ {fmtDate(v.submitted_at)}
            {v.verifier_name && ` · ผู้ตรวจ ${v.verifier_name}`}
          </p>
        </div>
        <Badge color={VERIFICATION_COLOR[v.status]}>{VERIFICATION_STATUS[v.status]}</Badge>
      </div>

      <p className="text-sm">
        ขอรับรอง <strong className="text-green-700">{fmtNum(v.reduction_tco2e)} tCO₂e</strong>
        <span className="text-stone-500"> · {v.method_version}</span>
      </p>
      {v.comment && <p className="text-sm text-stone-700">“{v.comment}”</p>}

      <Link to={`/cycles/${v.cycle_id}`} className="inline-block text-sm text-green-800 underline">
        ดูหลักฐาน: กราฟน้ำ รูปถ่าย และผลคำนวณ →
      </Link>

      {open && (
        <div className="space-y-2 border-t border-stone-100 pt-3">
          {v.status === 'pending' ? (
            <Button variant="secondary" disabled={busy} onClick={() => act('claim')}>
              รับเรื่องตรวจสอบ
            </Button>
          ) : (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="ความเห็น (ต้องระบุเมื่อไม่ผ่าน)"
                className={inputClass}
              />
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => act('decide', { status: 'approved', comment: comment || null })}>
                  รับรอง + ออกรายงาน
                </Button>
                <Button variant="danger" disabled={busy} onClick={() => act('decide', { status: 'rejected', comment })}>
                  ไม่ผ่าน
                </Button>
              </div>
            </>
          )}
          <ErrorBox error={error} />
        </div>
      )}
    </Card>
  )
}

export default function VerifyQueue() {
  const [status, setStatus] = useState('')
  const { data, error, loading, reload } = useApi(`/verifications${status ? `?status=${status}` : ''}`)

  return (
    <>
      <PageTitle title="คำขอตรวจสอบ" subtitle="ตรวจหลักฐาน AWD และรับรองปริมาณคาร์บอน" />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-3 py-1 text-sm ${status === f.value ? 'bg-green-700 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading && !data && <Loading />}
      <ErrorBox error={error} />
      {data?.length === 0 && <Empty>ไม่มีคำขอ</Empty>}
      <div className="space-y-3">
        {data?.map((v) => (
          <Request key={v.verification_id} v={v} reload={reload} />
        ))}
      </div>
    </>
  )
}
