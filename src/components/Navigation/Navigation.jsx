import { motion } from 'framer-motion'
import { Home, CalendarDays, Map, Music2, Settings } from 'lucide-react'

export const VIEWS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'forecast', label: 'Forecast', icon: CalendarDays },
  { id: 'map', label: 'Weather Map', short: 'Map', icon: Map },
  { id: 'music', label: 'Music', icon: Music2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Logo() {
  return (
    <span className="logo" aria-label="EUTOPIA">
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
        <circle cx="16" cy="15" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 22h24M9 26h14" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>EUTOPIA</span>
    </span>
  )
}

export default function Navigation({ view, onChange, search }) {
  return (
    <>
      <header className="topbar">
        <button className="logo-btn" onClick={() => onChange('home')} aria-label="EUTOPIA home"><Logo /></button>
        <nav className="nav-desktop" aria-label="Main">
          {VIEWS.map((v) => (
            <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => onChange(v.id)} aria-current={view === v.id ? 'page' : undefined}>
              {view === v.id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
              <span>{v.label}</span>
            </button>
          ))}
        </nav>
        <div className="topbar-search">{search}</div>
      </header>

      <nav className="nav-mobile" aria-label="Main">
        {VIEWS.map(({ id, label, short, icon: Icon }) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => onChange(id)} aria-current={view === id ? 'page' : undefined}>
            <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
            <span>{short || label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
