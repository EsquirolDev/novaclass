import { useEffect, useRef, useState } from 'react'
import { cx } from '../lib/cx.js'
import { href } from '../lib/router.jsx'
import { useAuth } from '../state/auth.jsx'
import { useClase } from '../state/clase.jsx'
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
        <UserMenu size={44} />
      </div>
    </header>
  )
}

/* Barra superior compacta (móvil) */
export function AppBar({ className }) {
  return (
    <header className={cx('nc-appbar', className)}>
      <a className="na-brand" href={href('/')} style={{ textDecoration: 'none' }}>
        {APP_NAME}
      </a>
      <ThemeButton />
      <Button variant="ghost" icon="bell" label="Notificaciones" />
      <UserMenu size={40} />
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

/* Avatar de quien ha entrado: abre un menú con su nombre, su correo y «Cerrar sesión» */
function UserMenu({ size }) {
  const { user, logout } = useAuth()
  const { user: demoUser } = useStore()
  const clase = useClase()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const away = e => !box.current?.contains(e.target) && setOpen(false)
    const esc = e => e.key === 'Escape' && (setOpen(false), box.current?.querySelector('button')?.focus())
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  /* Con el login apagado: el avatar de la persona de ejemplo, como antes */
  if (!user) return <Avatar name={demoUser} me size={size} />
  const name = user.name || user.email
  return (
    <div className="nc-usermenu" ref={box}>
      <button
        type="button"
        className="nc-usermenu-btn"
        aria-expanded={open}
        aria-label={'Tu cuenta: ' + name}
        onClick={() => setOpen(o => !o)}
      >
        <Avatar name={name} me size={size} />
      </button>
      {open ? (
        <div className="nc-usermenu-pop">
          <p className="who">
            <b>{name}</b>
            <span>{user.email}</span>
          </p>
          {clase.classes?.length ? (
            <div className="nc-usermenu-classes">
              <p className="na-t-eyebrow na-muted">{clase.classes.length > 1 ? 'Tus clases' : 'Tu clase'}</p>
              {clase.classes.map(g => {
                const on = clase.group?.id === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={cx('nc-classopt', on && 'is-on')}
                    aria-pressed={on}
                    disabled={clase.classes.length === 1}
                    onClick={() => {
                      clase.select(g.id)
                      setOpen(false)
                    }}
                  >
                    <b>{g.name}</b>
                    <span>
                      {g.expand?.school?.name}
                      {g.expand?.school?.verified ? <Icon name="shield" size={14} label="Escuela verificada" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
          <div className="nc-usermenu-links">
            {clase.group ? (
              <a href={href('/clase')} onClick={() => setOpen(false)}>
                <Icon name="user" size={18} />
                Tu clase
              </a>
            ) : null}
          </div>
          <Button variant="secondary" icon="logout" block onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      ) : null}
    </div>
  )
}
