import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth.jsx'
import { ROLE_LABEL } from '../format.js'

const FARMER_NAV = [
  { to: '/', label: 'แปลงนา', icon: '🌾' },
  { to: '/carbon', label: 'คาร์บอน', icon: '🌱' },
  { to: '/reports', label: 'รายงาน', icon: '📄' },
  { to: '/notifications', label: 'แจ้งเตือน', icon: '🔔' },
]

const VERIFIER_NAV = [
  { to: '/verify', label: 'ตรวจสอบ', icon: '✅' },
  { to: '/', label: 'แปลงนา', icon: '🌾' },
  { to: '/reports', label: 'รายงาน', icon: '📄' },
  { to: '/notifications', label: 'แจ้งเตือน', icon: '🔔' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = user.role === 'farmer' ? FARMER_NAV : VERIFIER_NAV

  return (
    <div className="min-h-dvh pb-20 sm:pb-6">
      <header className="no-print sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-green-800">
            <img src="/icon.svg" alt="" className="h-7 w-7" />
            CarbonCrops
          </NavLink>
          <nav className="hidden gap-1 sm:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-green-50 font-medium text-green-800' : 'text-stone-600 hover:bg-stone-100'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-right text-xs">
            <div className="leading-tight">
              <p className="font-medium text-stone-800">{user.display_name}</p>
              <p className="text-stone-500">{ROLE_LABEL[user.role]}</p>
            </div>
            <button type="button" onClick={logout} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100">
              ออก
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <Outlet />
      </main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-stone-200 bg-white sm:hidden">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 text-xs ${isActive ? 'font-medium text-green-800' : 'text-stone-500'}`
            }
          >
            <span aria-hidden="true" className="text-lg leading-none">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
