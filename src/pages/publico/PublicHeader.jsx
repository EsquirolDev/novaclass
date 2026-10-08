import { Button } from '../../components/index.js'
import { href } from '../../lib/router.jsx'

/* Barra de arriba para quien no ha entrado: marca y los dos caminos (entrar o crear cuenta) */
export function PublicHeader({ minimal }) {
  return (
    <header className="nc-pub-head">
      <a className="nc-pub-brand" href={href('/')}>
        <img src="/favicon.svg?v=2" alt="" width="32" height="32" />
        <span className="na-brand">NovaClass</span>
      </a>
      {minimal ? null : (
        <nav className="nc-pub-nav" aria-label="Cuenta">
          <Button variant="ghost" href={href('/entrar')}>
            Entrar
          </Button>
          <Button variant="primary" href={href('/registro')}>
            Crear cuenta
          </Button>
        </nav>
      )}
    </header>
  )
}
