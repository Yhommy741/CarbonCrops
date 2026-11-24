import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth.jsx'
import { usePreferences } from '../preferences.jsx'
import { PreferenceToggles } from './ui.jsx'

const FARMER_NAV = [
  { to: '/', label: 'nav.paddies', icon: '🌾' },
  { to: '/carbon', label: 'nav.carbon', icon: '🌱' },
  { to: '/reports', label: 'nav.reports', icon: '📄' },
  { to: '/notifications', label: 'nav.notifications', icon: '🔔' },
]

// Verifiers only review: the request queue, and farmers with their farming history
const VERIFIER_NAV = [
  { to: '/verify', label: 'nav.verify', icon: '✅' },
  { to: '/farmers', label: 'nav.farmers', icon: '👩‍🌾' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { t } = usePreferences()
  const nav = user.role === 'farmer' ? FARMER_NAV : VERIFIER_NAV

  return (
    <div className="min-h-dvh pb-20 sm:pb-6">
      <header className="no-print sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-green-800">
            <img src="/icon.svg" alt="" className="h-7 w-7" />
            <span className="hidden min-[400px]:inline">CarbonCrops</span>
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
                {t(n.label)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1 text-right text-xs">
            <PreferenceToggles />
            <div className="ml-1 leading-tight">
              <p className="font-medium text-stone-800">{user.display_name}</p>
              <p className="text-stone-500">{t(`role.${user.role}`)}</p>
            </div>
            <button type="button" onClick={logout} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100">
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <Outlet />
      </main>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-10 grid border-t border-stone-200 bg-white sm:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
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
            {t(n.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
