import { Button } from '../../components/index.js'
import { href } from '../../lib/router.jsx'

/* Barra de arriba para quien no ha entrado: marca y entrar (las cuentas las da la escuela) */
export function PublicHeader({ minimal }) {
  return (
    <header className="nc-pub-head">
      <a className="nc-pub-brand" href={href('/')}>
        <img src="/favicon.svg?v=2" alt="" width="32" height="32" />
        <span className="na-brand">NovaClass</span>
      </a>
      {minimal ? null : (
        <nav className="nc-pub-nav" aria-label="Cuenta">
          <Button variant="primary" href={href('/entrar')}>
            Entrar
          </Button>
        </nav>
      )}
    </header>
  )
}
