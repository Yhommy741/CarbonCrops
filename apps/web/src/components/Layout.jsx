import { BadgeCheck, History, Leaf, LogOut, Users, Wheat } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth.jsx'
import { usePreferences } from '../preferences.jsx'
import { PreferenceToggles } from './ui.jsx'

const FARMER_NAV = [
  { to: '/', label: 'nav.paddies', icon: Wheat },
  { to: '/carbon', label: 'nav.carbon', icon: Leaf },
  { to: '/history', label: 'nav.history', icon: History },
]

// Verifiers only review: the request queue, and farmers with their farming history
const VERIFIER_NAV = [
  { to: '/verify', label: 'nav.verify', icon: BadgeCheck },
  { to: '/farmers', label: 'nav.farmers', icon: Users },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { t } = usePreferences()
  const nav = user.role === 'farmer' ? FARMER_NAV : VERIFIER_NAV

  return (
    <div className="min-h-dvh pb-20 sm:pb-6">
      <header className="no-print sticky top-0 z-10 bg-nav text-nav-ink shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-nav-ink">
            <img src="/icon-512.png" alt="" className="h-7 w-7" />
            <span className="hidden min-[400px]:inline">CarbonCrops</span>
          </NavLink>
          <nav className="hidden gap-1 sm:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-nav-active font-medium text-nav-ink' : 'text-nav-muted hover:bg-nav-hover hover:text-nav-ink'}`
                }
              >
                <n.icon size={16} aria-hidden="true" />
                {t(n.label)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1 text-right text-xs">
            <PreferenceToggles onNav />
            <div className="ml-1 leading-tight">
              <p className="font-medium text-nav-ink">{user.display_name}</p>
              <p className="text-nav-muted">{t(`role.${user.role}`)}</p>
            </div>
            <button type="button" onClick={logout} className="flex items-center gap-1 rounded-lg px-2 py-1 text-nav-muted hover:bg-nav-hover hover:text-nav-ink">
              <LogOut size={14} aria-hidden="true" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <Outlet />
      </main>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-10 grid bg-nav pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgb(0_0_0/0.12)] sm:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'bg-nav-active font-medium text-nav-ink' : 'text-nav-muted'}`
            }
          >
            <n.icon size={22} aria-hidden="true" />
            {t(n.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
