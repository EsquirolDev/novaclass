import { useEffect, useRef } from 'react'
import { AppBar, BottomNav, TopBar } from './components/index.js'
import { match, navigate, useRoute } from './lib/router.jsx'
import Apuntes from './pages/Apuntes.jsx'
import Asignatura from './pages/Asignatura.jsx'
import Asignaturas from './pages/Asignaturas.jsx'
import Calendario from './pages/Calendario.jsx'
import Duda from './pages/Duda.jsx'
import DudaNueva from './pages/DudaNueva.jsx'
import Dudas from './pages/Dudas.jsx'
import Inicio from './pages/Inicio.jsx'
import Mejoras from './pages/Mejoras.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'
import { planFinished } from './data/plan.js'
import { useStore } from './state/store.jsx'

const ROUTES = [
  ['/', 'inicio', Inicio],
  ['/calendario', 'calendario', Calendario],
  ['/asignaturas', 'asignaturas', Asignaturas],
  ['/asignaturas/:id', 'asignaturas', Asignatura],
  ['/dudas', 'dudas', Dudas],
  ['/dudas/nueva', 'dudas', DudaNueva],
  ['/dudas/:id', 'dudas', Duda],
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
      <Page {...params} key={path} />
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
