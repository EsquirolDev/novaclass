import { Button, Icon } from '../components/index.js'
import { firstName } from '../lib/users.js'
import { useAuth } from '../state/auth.jsx'

/*
 * Con sesión pero sin ningún curso: las cuentas y los cursos los pone la escuela (docs/escuelas.md), así que aquí solo
 * se explica a quién pedirlo.
 */
export default function SinClase() {
  const { user, logout } = useAuth()
  const docente = user?.role === 'docente'
  return (
    <div className="nc-screen">
      <main className="nc-pad nc-state-page">
        <div className="nc-state nc-noclase">
          <span className="nc-state-icon" aria-hidden="true">
            <Icon name="school" size={26} />
          </span>
          <div className="nc-state-text">
            <h1 className="t">
              Hola, {firstName(user)}. Aún no tienes {docente ? 'ninguna asignatura' : 'curso'}
            </h1>
            <p className="d">
              {docente
                ? 'Cuando la dirección de tu escuela te ponga en el horario de un curso, lo verás aquí.'
                : 'La dirección de tu escuela te pondrá en tu curso. Si crees que ya debería estar, pregunta a tu Tutor o en secretaría.'}
            </p>
          </div>
          <div className="nc-state-actions">
            <Button variant="secondary" icon="logout" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
