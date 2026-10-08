import { lazy, Suspense, useEffect, useRef } from 'react'
import { AppBar, BottomNav, ErrorBoundary, LoadingState, OfflineBanner, TopBar } from './components/index.js'
import { planFinished } from './data/plan.js'
import { match, navigate, useRoute } from './lib/router.jsx'
import Inicio from './pages/Inicio.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'
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

export default function App() {
  const path = useRoute()
  const { section, Page, params } = resolve(path)
  usePlanKey(path)
  return (
    <div className="nc-app">
      <button type="button" className="nc-skip" onClick={skipToMain}>
        Saltar al contenido
      </button>
      <TopBar active={section} className="nc-only-desktop" />
      <AppBar className="nc-only-mobile" />
      <OfflineBanner />
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
