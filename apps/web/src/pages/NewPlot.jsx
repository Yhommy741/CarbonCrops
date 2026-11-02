import { useState } from 'react'
import { useNavigate } from 'react-router'
import { api, getPosition } from '../api.js'
import { Button, Card, ErrorBox, Field, inputClass, PageTitle } from '../components/ui.jsx'

const EMPTY = {
  plot_name: '',
  area_rai: '',
  province: '',
  district: '',
  subdistrict: '',
  land_doc_no: '',
  latitude: '',
  longitude: '',
}

const orNull = (v) => (v === '' ? null : v)

export default function NewPlot() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function useMyLocation() {
    setLocating(true)
    const pos = await getPosition()
    setLocating(false)
    if (!pos) return setError(new Error('ไม่สามารถอ่านตำแหน่ง GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง'))
    setForm((f) => ({ ...f, latitude: pos.latitude.toFixed(6), longitude: pos.longitude.toFixed(6) }))
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { plot_id } = await api('/plots', {
        method: 'POST',
        body: {
          plot_name: form.plot_name,
          area_rai: Number(form.area_rai),
          province: orNull(form.province),
          district: orNull(form.district),
          subdistrict: orNull(form.subdistrict),
          land_doc_no: orNull(form.land_doc_no),
          latitude: form.latitude === '' ? null : Number(form.latitude),
          longitude: form.longitude === '' ? null : Number(form.longitude),
        },
      })
      navigate(`/plots/${plot_id}`)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <>
      <PageTitle title="เพิ่มแปลงนา" />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="ชื่อแปลง">
            <input required value={form.plot_name} onChange={set('plot_name')} className={inputClass} placeholder="เช่น นาหลังบ้าน" />
          </Field>
          <Field label="ขนาดพื้นที่ (ไร่)">
            <input required type="number" min="0.01" step="0.01" inputMode="decimal" value={form.area_rai} onChange={set('area_rai')} className={inputClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="จังหวัด">
              <input value={form.province} onChange={set('province')} className={inputClass} />
            </Field>
            <Field label="อำเภอ">
              <input value={form.district} onChange={set('district')} className={inputClass} />
            </Field>
            <Field label="ตำบล">
              <input value={form.subdistrict} onChange={set('subdistrict')} className={inputClass} />
            </Field>
          </div>
          <Field label="เลขที่เอกสารสิทธิ์" hint="เช่น นส.4 12345 (ถ้ามี)">
            <input value={form.land_doc_no} onChange={set('land_doc_no')} className={inputClass} />
          </Field>
          <div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ละติจูด">
                <input type="number" step="any" value={form.latitude} onChange={set('latitude')} className={inputClass} />
              </Field>
              <Field label="ลองจิจูด">
                <input type="number" step="any" value={form.longitude} onChange={set('longitude')} className={inputClass} />
              </Field>
            </div>
            <Button variant="secondary" className="mt-2" onClick={useMyLocation} disabled={locating}>
              📍 {locating ? 'กำลังอ่านตำแหน่ง…' : 'ใช้ตำแหน่งปัจจุบัน (ยืนอยู่ในแปลง)'}
            </Button>
          </div>
          <ErrorBox error={error} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'กำลังบันทึก…' : 'บันทึกแปลง'}
          </Button>
        </form>
      </Card>
    </>
  )
}
