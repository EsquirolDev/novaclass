import { Button, EventChip, Icon, Sigil, SubjectTag } from '../../components/index.js'
import { SUBJECT_ORDER, subjectVars } from '../../data/subjects.js'
import { href } from '../../lib/router.jsx'
import { PublicHeader } from './PublicHeader.jsx'

const FEATURES = [
  {
    icon: 'calendar',
    title: 'Entregas y exámenes',
    text: 'Todo lo que hay que entregar o estudiar, por mes, por semana o en agenda. Marcas lo que ya está hecho y sabes cuánto falta para lo siguiente.',
  },
  {
    icon: 'clock',
    title: 'Tu horario de verdad',
    text: 'El horario de tu clase, con qué toca ahora, cuánto queda para el patio y a qué hora sales cada día.',
  },
  {
    icon: 'help',
    title: 'Dudas entre la clase',
    text: 'Pregunta lo que no te sale y responde lo que sabes. Las respuestas más votadas suben y quien pregunta marca la que le sirvió.',
  },
  {
    icon: 'notes',
    title: 'Apuntes compartidos',
    text: 'PDF, enlaces y notas ordenados por asignatura y tema, para repasar antes del examen sin buscar por mil chats.',
  },
]

const ROLES = [
  {
    icon: 'user',
    title: 'Estudiantes',
    text: 'Lo que tienes que hacer hoy, sin perder nada. El Delegado y el Subdelegado ayudan a mantener el calendario al día.',
  },
  {
    icon: 'book',
    title: 'Docentes y Tutor',
    text: 'Publicáis entregas y exámenes una vez y llegan a toda la clase. El Tutor organiza la clase y sus cargos.',
  },
  { icon: 'school', title: 'Dirección', text: 'Crea la escuela y sus clases, y ve de un vistazo cómo va cada una.' },
]

/* Portada para quien aún no ha entrado: qué es NovaClass y cómo empezar */
export default function Landing() {
  return (
    <div className="nc-pub">
      <PublicHeader />
      <main>
        <section className="nc-land-hero" aria-labelledby="land-t">
          <div className="txt">
            <p className="na-t-eyebrow na-muted">Para tu clase de FP</p>
            <h1 id="land-t" className="nc-land-title">
              Todo lo de clase, en un solo sitio.
            </h1>
            <p className="nc-land-lead">
              Entregas, exámenes, horario, dudas y apuntes de tu clase. Cada asignatura con su color y su forma, para orientarte de un
              vistazo.
            </p>
            <div className="nc-land-cta">
              <Button variant="primary" size="lg" icon="plus" href={href('/registro')}>
                Crear cuenta
              </Button>
              <Button variant="secondary" size="lg" href={href('/entrar')}>
                Ya tengo cuenta
              </Button>
            </div>
            <div className="nc-land-subjects" aria-label="Así se ven las asignaturas">
              {SUBJECT_ORDER.map(k => (
                <SubjectTag key={k} subject={k} />
              ))}
            </div>
          </div>
          <Preview />
        </section>

        <section className="nc-land-sec" aria-labelledby="land-f">
          <h2 id="land-f" className="nc-land-h2">
            Lo que necesitas cada día
          </h2>
          <ul className="nc-land-grid">
            {FEATURES.map(f => (
              <li key={f.title} className="nc-land-card">
                <span className="ic" aria-hidden="true">
                  <Icon name={f.icon} size={22} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="nc-land-sec" aria-labelledby="land-r">
          <h2 id="land-r" className="nc-land-h2">
            Para toda la escuela
          </h2>
          <ul className="nc-land-grid nc-land-grid--3">
            {ROLES.map(r => (
              <li key={r.title} className="nc-land-card">
                <span className="ic" aria-hidden="true">
                  <Icon name={r.icon} size={22} />
                </span>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="nc-land-sec nc-land-school" aria-labelledby="land-s">
          <span className="ic" aria-hidden="true">
            <Icon name="shield" size={26} />
          </span>
          <div>
            <h2 id="land-s" className="nc-land-h2">
              Tu escuela, verificada
            </h2>
            <p>
              Cualquiera puede crear su escuela y abrir sus clases. Las escuelas comprobadas por NovaClass llevan el sello de verificada,
              para que sepas que es la de verdad. Para entrar en tu clase solo necesitas su código.
            </p>
          </div>
        </section>

        <section className="nc-land-final" aria-labelledby="land-c">
          <h2 id="land-c" className="nc-land-h2">
            Empieza hoy
          </h2>
          <p className="na-muted">Crear la cuenta lleva un minuto.</p>
          <Button variant="primary" size="lg" icon="plus" href={href('/registro')}>
            Crear cuenta
          </Button>
        </section>
      </main>
      <footer className="nc-pub-foot">
        <span className="na-brand">NovaClass</span>
        <span className="na-muted">Hecho en 1.º DAW</span>
      </footer>
    </div>
  )
}

/* Una vista previa con los componentes de verdad: el bloque «Lo siguiente» y la semana */
function Preview() {
  return (
    <div className="nc-land-preview" aria-hidden="true">
      <div className="next" style={subjectVars('pro')}>
        <Sigil subject="pro" variant="outline" tone="current" size={160} strokeWidth={1.6} className="deco" />
        <span className="na-t-eyebrow">Lo siguiente · Entrega</span>
        <SubjectTag subject="pro" variant="oncolor" showName />
        <b className="t">Ejercicios bucles</b>
        <span className="when">
          <Icon name="clock" size={16} />
          Jueves 8 oct · 23:59
        </span>
        <span className="count na-num">
          <b>0</b>d <b>09</b>h <b>12</b>m
        </span>
      </div>
      <div className="week">
        <EventChip type="entrega" subject="bd" title="Modelo E/R biblioteca" time="23:59" compact />
        <EventChip type="examen" subject="si" title="Redes y subnetting" time="15:55" compact />
        <EventChip type="entrega" subject="lm" title="Formulario accesible" time="23:59" compact />
        <EventChip type="entrega" subject="ed" title="Git: ramas y merge" done compact />
      </div>
    </div>
  )
}
