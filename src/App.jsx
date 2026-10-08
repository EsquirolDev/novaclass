import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AppBar, BottomNav, ErrorBoundary, LoadingState, OfflineBanner, TopBar } from './components/index.js'
import { planFinished } from './data/plan.js'
import { AUTH_ON } from './lib/flags.js'
import { match, navigate, useRoute } from './lib/router.jsx'
import Inicio from './pages/Inicio.jsx'
import { Entrar, Recuperar, Registro } from './pages/publico/Cuenta.jsx'
import Landing from './pages/publico/Landing.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'
import { useAuth } from './state/auth.jsx'
import { useStore } from './state/store.jsx'

/* Inicio va en el paquete principal; el resto de pantallas se cargan al entrar (mientras, se ve el esqueleto) */
const Apuntes = lazy(() => import('./pages/Apuntes.jsx'))
const Asignatura = lazy(() => import('./pages/Asignatura.jsx'))
const Asignaturas = lazy(() => import('./pages/Asignaturas.jsx'))
const Calendario = lazy(() => import('./pages/Calendario.jsx'))
const Duda = lazy(() => import('./pages/Duda.jsx'))
const DudaNueva = lazy(() => import('./pages/DudaNueva.jsx'))
const Dudas = lazy(() => import('./pages/Dudas.jsx'))
const Mejoras = lazy(() => import('./pages/Mejoras.jsx'))

const ROUTES = [
  ['/', 'inicio', Inicio],
  ['/calendario', 'calendario', Calendario],
  ['/asignaturas', 'asignaturas', Asignaturas],
  ['/asignaturas/:id', 'asignaturas', Asignatura],
  ['/dudas', 'dudas', Dudas],
  ['/dudas/nueva', 'dudas', DudaNueva],
  ['/dudas/:id', 'dudas', Duda],
  ['/dudas/:id/editar', 'dudas', DudaNueva],
  ['/apuntes', 'apuntes', Apuntes],
  ['/mejoras', null, Mejoras],
]

function resolve(path) {
  for (const [pattern, section, Page] of ROUTES) {
    const params = match(pattern, path)
    if (params) return { section, Page, params }
  }
  return { section: null, Page: NoEncontrada, params: {} }
}

/* Pantallas para quien no ha entrado */
const PUBLIC = { '/': Landing, '/entrar': Entrar, '/registro': Registro, '/recuperar': Recuperar }

/* Con sesión, la app; sin ella, la portada y las pantallas de cuenta. Con el login apagado (AUTH_ON), siempre la app. */
export default function App() {
  const { user } = useAuth()
  const path = useRoute()
  return user || !AUTH_ON ? <PrivateApp path={path} /> : <PublicApp path={path} />
}

function PublicApp({ path }) {
  const route = path.split('?')[0]
  const Page = PUBLIC[route]
  /* Una pantalla de la app sin sesión: se pide entrar y luego se vuelve a ella */
  if (!Page) return <Entrar next={path} />
  return <Page />
}

function PrivateApp({ path }) {
  const route = path.split('?')[0]
  const publicOnly = route !== '/' && route in PUBLIC
  /* Ya con sesión, /entrar o /registro llevan a Inicio */
  useEffect(() => {
    if (publicOnly) navigate('/')
  }, [publicOnly])
  const { section, Page, params } = resolve(publicOnly ? '/' : path)
  usePlanKey(path)
  return (
    <div className="nc-app">
      <button type="button" className="nc-skip" onClick={skipToMain}>
        Saltar al contenido
      </button>
      <TopBar active={section} className="nc-only-desktop" />
      <AppBar className="nc-only-mobile" />
      <OfflineBanner />
      <DemoNotice />
      <ErrorBoundary resetKey={path}>
        <Suspense fallback={<LoadingState />}>
          <Page {...params} key={path} />
        </Suspense>
      </ErrorBoundary>
      <div className="nc-bottomnav nc-only-mobile">
        <BottomNav active={section === 'asignaturas' ? null : section} />
      </div>
    </div>
  )
}

/*
 * Tecla M: abre el plan de mejoras y, si ya está abierto, vuelve a donde estabas. No hace nada al escribir.
 * Si se sale del plan con todas las tareas hechas, se cierra para siempre.
 */
function usePlanKey(path) {
  const { plan, planClosed, closePlan } = useStore()
  const back = useRef('/')
  const prev = useRef(path)
  if (path !== '/mejoras') back.current = path
  useEffect(() => {
    if (prev.current === '/mejoras' && path !== '/mejoras' && !planClosed && planFinished(plan)) closePlan()
    prev.current = path
  }, [path, plan, planClosed, closePlan])
  useEffect(() => {
    if (planClosed) return undefined
    function onKey(e) {
      if (e.key.toLowerCase() !== 'm' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const t = e.target
      if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      navigate(path === '/mejoras' ? back.current : '/mejoras')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [path, planClosed])
}

/* «Saltar al contenido»: con rutas por hash no sirve un enlace #main, así que se enfoca el <main> a mano */
function skipToMain() {
  const main = document.querySelector('main')
  if (!main) return
  main.setAttribute('tabindex', '-1')
  main.focus()
}

/* Hasta conectar el store a PocketBase, lo que se ve dentro es una clase de ejemplo: se dice, y se puede cerrar */
function DemoNotice() {
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem('nc-demo-hidden') === '1'
    } catch {
      return false
    }
  })
  if (hidden) return null
  function hide() {
    setHidden(true)
    try {
      sessionStorage.setItem('nc-demo-hidden', '1')
    } catch {
      /* sin almacenamiento: se vuelve a ver al recargar */
    }
  }
  return (
    <aside className="nc-demo" aria-label="Aviso">
      <span>Estás viendo una clase de ejemplo. Muy pronto podrás unirte a la tuya con su código.</span>
      <button type="button" aria-label="Cerrar aviso" onClick={hide}>
        ×
      </button>
    </aside>
  )
}
