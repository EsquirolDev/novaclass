import { Component, useEffect, useState } from 'react'
import { cx } from '../lib/cx.js'
import { Button } from './controls.jsx'
import { Icon } from './Icon.jsx'

/*
 * Estados de una pantalla o de una lista: vacío, cargando y error.
 * Siempre dicen qué pasa y, si se puede, qué hacer (una acción, nunca más de dos).
 */

/* Vacío: no hay nada que enseñar. `compact` para dentro de una tarjeta o lista. */
export function EmptyState({ icon = 'inbox', title, children, action, compact, className }) {
  return (
    <div className={cx('nc-state', compact && 'is-compact', className)}>
      <span className="nc-state-icon" aria-hidden="true">
        <Icon name={icon} size={compact ? 20 : 26} />
      </span>
      <div className="nc-state-text">
        <p className="t">{title}</p>
        {children ? <p className="d">{children}</p> : null}
      </div>
      {action ? <div className="nc-state-actions">{action}</div> : null}
    </div>
  )
}

/* Error: algo ha fallado. `onRetry` muestra «Reintentar». */
export function ErrorState({ title = 'Algo ha fallado', children, onRetry, action, compact, className }) {
  return (
    <div className={cx('nc-state', 'is-error', compact && 'is-compact', className)} role="alert">
      <span className="nc-state-icon" aria-hidden="true">
        <Icon name="alert" size={compact ? 20 : 26} strokeWidth={2.2} />
      </span>
      <div className="nc-state-text">
        <p className="t">{title}</p>
        {children ? <p className="d">{children}</p> : null}
      </div>
      {onRetry || action ? (
        <div className="nc-state-actions">
          {onRetry ? (
            <Button variant="primary" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  )
}

/* Cargando: esqueleto con la forma aproximada de una pantalla (título y tarjetas) en vez de un spinner */
export function LoadingState({ label = 'Cargando…', rows = 3 }) {
  /* Si carga rápido no se ve nada: el esqueleto solo aparece pasados 200 ms, para no parpadear */
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className={cx('nc-skel', show && 'is-on')} role="status" aria-live="polite">
      <span className="na-sr">{label}</span>
      <span className="b h1" />
      <span className="b sub" />
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="b card" />
      ))}
    </div>
  )
}

/* Captura los errores de una pantalla para que no se quede en blanco; `resetKey` (la ruta) lo reinicia al navegar */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error en la pantalla:', error, info.componentStack)
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="nc-screen">
        <main className="nc-pad nc-state-page">
          <h1 className="na-sr">Error</h1>
          {/* Reintentar recarga la página: si falló al descargar la pantalla (sin conexión, versión nueva), React no vuelve a pedirla */}
          <ErrorState
            title="Esta pantalla no ha cargado"
            onRetry={() => window.location.reload()}
            action={
              <Button variant="secondary" icon="home" href="#/">
                Ir a Inicio
              </Button>
            }
          >
            {navigator.onLine
              ? 'Ha fallado algo de la app, no es cosa tuya. Si vuelve a pasar, avísanos.'
              : 'Estás sin conexión y esta pantalla aún no estaba descargada. Vuelve a intentarlo cuando tengas internet.'}
          </ErrorState>
        </main>
      </div>
    )
  }
}

/* Aviso fijo cuando el dispositivo se queda sin conexión */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (online) return null
  return (
    <div className="nc-offline" role="status">
      <Icon name="offline" size={16} strokeWidth={2.4} />
      Sin conexión. Lo que marques se guarda en este dispositivo.
    </div>
  )
}
