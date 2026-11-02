export const PHASE_LABEL = {
  flooded: 'ขังน้ำ',
  drying: 'ปล่อยแห้ง',
  reflood: 'เติมน้ำกลับ',
  final_drain: 'ระบายน้ำก่อนเกี่ยว',
  no_data: 'ไม่มีข้อมูลเซ็นเซอร์',
}

// Common Thai rice fertilizer formulas (N-P-K)
export const FERTILIZER_FORMULAS = ['16-20-0', '46-0-0', '15-15-15', '16-16-8', '16-8-8', '21-0-0']

export const ACTIVITY_LABEL = {
  land_prep: 'เตรียมดิน',
  planting: 'ปลูก / หว่าน',
  fertilizing: 'ใส่ปุ๋ย',
  drain: 'ระบายน้ำออก',
  flood: 'ปล่อยน้ำเข้า',
  pesticide: 'ฉีดพ่นยา',
  harvest: 'เก็บเกี่ยว',
  other: 'อื่น ๆ',
}

export const CYCLE_STATUS = {
  planned: 'วางแผน',
  active: 'กำลังปลูก',
  harvested: 'เก็บเกี่ยวแล้ว',
  closed: 'ปิดรอบ',
}

export const VERIFICATION_STATUS = {
  pending: 'รอตรวจสอบ',
  in_review: 'กำลังตรวจสอบ',
  approved: 'รับรองแล้ว',
  rejected: 'ไม่ผ่าน',
}

export const ROLE_LABEL = { farmer: 'เกษตรกร', verifier: 'ผู้ตรวจสอบ', admin: 'ผู้ดูแลระบบ' }

export const REGIME_LABEL = {
  continuous: 'ขังน้ำตลอด',
  single: 'ปล่อยแห้ง 1 ครั้ง',
  multiple: 'ปล่อยแห้งหลายครั้ง',
}

export function fmtDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

export function fmtDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtNum(value, digits = 2) {
  if (value === null || value === undefined) return '-'
  return Number(value).toLocaleString('th-TH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export const fmtBaht = (value) => `${fmtNum(value, 0)} บาท`

/** Today as YYYY-MM-DD in local time (for <input type="date">). */
export function todayISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
