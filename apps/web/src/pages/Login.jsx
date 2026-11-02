import { useState } from 'react'
import { useApi } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Card, ErrorBox, Loading } from '../components/ui.jsx'
import { ROLE_LABEL } from '../format.js'

// Development login: pick a user from the database. Replace with LINE Login
// (auth_identities table) before real farmers use the app.
export default function Login() {
  const { loginAs } = useAuth()
  const { data: users, error, loading } = useApi('/auth/demo-users')
  const [busy, setBusy] = useState(null)
  const [loginError, setLoginError] = useState(null)

  async function pick(userId) {
    setBusy(userId)
    setLoginError(null)
    try {
      await loginAs(userId)
    } catch (err) {
      setLoginError(err)
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <img src="/icon.svg" alt="" className="mx-auto mb-3 h-16 w-16" />
        <h1 className="text-2xl font-semibold text-green-800">CarbonCrops</h1>
        <p className="text-stone-500">ทำนาเปียกสลับแห้ง ลดโลกร้อน ได้คาร์บอนเครดิต</p>
      </div>
      <Card>
        <h2 className="mb-1 font-semibold">เข้าสู่ระบบ</h2>
        <p className="mb-4 text-xs text-stone-500">โหมดทดสอบ: เลือกผู้ใช้จากฐานข้อมูล (ยังไม่ได้เชื่อม LINE Login)</p>
        {loading && <Loading />}
        <ErrorBox error={error || loginError} />
        <ul className="space-y-2">
          {users?.map((u) => (
            <li key={u.user_id}>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => pick(u.user_id)}
                className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-left hover:border-green-600 hover:bg-green-50 disabled:opacity-60"
              >
                <span>
                  <span className="block font-medium">{u.display_name}</span>
                  <span className="text-xs text-stone-500">{u.province}</span>
                </span>
                <span className="text-xs text-stone-500">
                  {busy === u.user_id ? 'กำลังเข้า…' : ROLE_LABEL[u.role]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
