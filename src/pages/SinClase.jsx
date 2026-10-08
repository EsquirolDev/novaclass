import { Button, Icon } from '../components/index.js'
import { firstName } from '../lib/users.js'
import { useAuth } from '../state/auth.jsx'
import { useClase } from '../state/clase.jsx'

/* Con sesión pero sin ninguna clase: qué pasa y qué hacer mientras tanto */
export default function SinClase() {
  const { user, logout } = useAuth()
  const { showDemo } = useClase()
  return (
    <div className="nc-screen">
      <main className="nc-pad nc-state-page">
        <div className="nc-state nc-noclase">
          <span className="nc-state-icon" aria-hidden="true">
            <Icon name="school" size={26} />
          </span>
          <div className="nc-state-text">
            <h1 className="t">Hola, {firstName(user)}. Aún no estás en ninguna clase</h1>
            <p className="d">
              Pide a tu Tutor el código de tu clase. Muy pronto podrás unirte con él desde aquí, o te añadirá directamente tu Tutor o la
              dirección de tu escuela.
            </p>
          </div>
          <div className="nc-state-actions">
            <Button variant="primary" icon="calendar" onClick={() => showDemo(true)}>
              Ver una clase de ejemplo
            </Button>
            <Button variant="secondary" icon="logout" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
