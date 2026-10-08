import { cx } from '../lib/cx.js'
import { href } from '../lib/router.jsx'
import { useStore } from '../state/store.jsx'
import { Button, Pill } from './controls.jsx'
import { Avatar } from './display.jsx'
import { Icon } from './Icon.jsx'

export const APP_NAME = 'NovaClass'

const NAV = [
  { id: 'inicio', to: '/', label: 'Inicio', icon: 'home' },
  { id: 'calendario', to: '/calendario', label: 'Calendario', icon: 'calendar' },
  { id: 'asignaturas', to: '/asignaturas', label: 'Asignaturas', icon: 'book' },
  { id: 'dudas', to: '/dudas', label: 'Dudas', icon: 'help' },
  { id: 'apuntes', to: '/apuntes', label: 'Apuntes', icon: 'notes' },
]

function ThemeButton() {
  const { theme, setTheme } = useStore()
  const dark = theme === 'dark'
  return (
    <Button
      variant="ghost"
      icon={dark ? 'sun' : 'moon'}
      label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    />
  )
}

/* Barra superior (escritorio) */
export function TopBar({ active, className }) {
  const { user } = useStore()
  return (
    <header className={cx('na-topbar', className)}>
      <a className="na-brand" href={href('/')} style={{ textDecoration: 'none' }}>
        {APP_NAME}
      </a>
      <nav className="na-nav" aria-label="Principal">
        {NAV.map(n => (
          <Pill key={n.id} href={href(n.to)} variant="ghost" current={n.id === active} icon={n.icon}>
            {n.label}
          </Pill>
        ))}
      </nav>
      <div className="na-topbar-end">
        <div className="na-search" role="search">
          <Icon name="search" size={18} />
          Buscar en clase<kbd>Ctrl K</kbd>
        </div>
        <ThemeButton />
        <Button variant="ghost" icon="bell" label="Notificaciones" />
        <Avatar name={user} me size={44} />
      </div>
    </header>
  )
}

/* Barra superior compacta (móvil) */
export function AppBar({ className }) {
  const { user } = useStore()
  return (
    <header className={cx('nc-appbar', className)}>
      <a className="na-brand" href={href('/')} style={{ textDecoration: 'none' }}>
        {APP_NAME}
      </a>
      <ThemeButton />
      <Button variant="ghost" icon="bell" label="Notificaciones" />
      <Avatar name={user} me size={40} />
    </header>
  )
}

const BNAV = [NAV[0], NAV[1], NAV[3], NAV[4]]

/* Navegación inferior flotante (móvil) */
export function BottomNav({ active, className }) {
  return (
    <nav className={cx('na-bottomnav', className)} aria-label="Principal">
      {BNAV.map(n => (
        <a key={n.id} href={href(n.to)} className="na-bn-item" aria-current={n.id === active ? 'page' : undefined}>
          <span className="na-bn-ico">
            <Icon name={n.icon} size={22} />
          </span>
          {n.label}
        </a>
      ))}
    </nav>
  )
}
