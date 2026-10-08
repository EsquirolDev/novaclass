import { Button, Countdown, EmptyState, Hero, Icon, ListRow, SectionTitle, Sigil, SubjectTag } from '../components/index.js'
import { SUBJECTS } from '../data/subjects.js'
import { countdown, mediumDate, relative, shortDate, todayLong, todayShort } from '../lib/dates.js'
import { href } from '../lib/router.jsx'
import { nextUp, weekDays } from '../state/selectors.js'
import { firstName } from '../lib/users.js'
import { useAuth } from '../state/auth.jsx'
import { useStore } from '../state/store.jsx'

/*
 * Inicio responde a una sola pregunta: «¿qué tengo que hacer ahora?».
 * Lo siguiente, lo que viene después y atajos al resto. El detalle vive en cada sección.
 */
export default function Inicio() {
  const { user: auth } = useAuth()
  const { now, events, dudas, apuntes, welcomed, setWelcomed, setDone } = useStore()
  const pending = events.filter(e => e.type !== 'festivo' && !e.done && e.at > now)
  const next = nextUp(events, now)
  const after = pending.filter(e => e !== next).slice(0, 3)
  const week = weekDays(events, now, now)
    .flatMap(d => d.events)
    .filter(e => !e.done && e.raw.at > now)
  const sinResponder = dudas.filter(d => d.status === 'sin-responder').length

  return (
    <div className="nc-screen">
      <main className="nc-home">
        <header className="nc-greet">
          <p className="na-t-subtitle na-muted">Hola, {firstName(auth)}</p>
          <h1 className="na-t-display-xl nc-only-desktop">{todayLong(now)}</h1>
          <h1 className="na-t-display-xl nc-only-mobile">{todayShort(now)}</h1>
          <p className="na-t-subtitle nc-greet-summary">{weekSummary(week)}</p>
        </header>

        {!welcomed ? <Welcome onClose={() => setWelcomed(true)} /> : null}

        {next ? (
          <NextHero event={next} now={now} onDone={() => setDone(next.id, true)} />
        ) : (
          <EmptyState
            icon="check"
            title="Lo tienes todo al día"
            className="nc-state-card"
            action={
              <Button variant="secondary" icon="calendar" href={href('/calendario')}>
                Ver calendario
              </Button>
            }
          >
            No tienes entregas ni exámenes pendientes. Cuando haya algo nuevo, saldrá aquí.
          </EmptyState>
        )}

        {after.length ? (
          <section>
            <SectionTitle action="Ver calendario" to="/calendario">
              Después
            </SectionTitle>
            <div className="na-card" style={{ padding: 6 }}>
              <div className="na-list na-list--divided">
                {after.map(e => (
                  <ListRow
                    key={e.id}
                    to={'/calendario?d=' + e.date}
                    leading={
                      <span className="nc-kind" style={{ color: `var(--${e.subject})` }}>
                        {e.type === 'examen' ? <Icon name="flag" size={18} strokeWidth={2.4} /> : <Sigil subject={e.subject} size={14} />}
                      </span>
                    }
                    title={(e.type === 'examen' ? 'Examen: ' : '') + e.title}
                    meta={[<SubjectTag key="t" subject={e.subject} />, <span key="d">{shortDate(e.date, e.time)}</span>]}
                    trailing={<span className="na-t-label na-muted">{relative(now, e.date)}</span>}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section>
          <SectionTitle>Tu clase</SectionTitle>
          <div className="nc-shortcuts">
            <Shortcut to="/calendario" icon="calendar" title="Calendario" text="Todas las entregas y exámenes del curso." />
            <Shortcut to="/asignaturas" icon="book" title="Asignaturas" text="Lo que llevas hecho en cada módulo." />
            <Shortcut
              to="/dudas"
              icon="help"
              title="Dudas"
              text={sinResponder ? `${sinResponder} sin responder. ¿Puedes ayudar?` : 'Pregunta a la clase o responde.'}
            />
            <Shortcut to="/apuntes" icon="notes" title="Apuntes" text={`${apuntes.length} apuntes compartidos por la clase.`} />
          </div>
        </section>
      </main>
    </div>
  )
}

/* «Esta semana te quedan 2 entregas y 1 examen.» */
function weekSummary(items) {
  const n = items.filter(e => e.type === 'entrega').length
  const x = items.filter(e => e.type === 'examen').length
  if (!n && !x) return 'No te queda nada más esta semana.'
  const parts = []
  if (n) parts.push(`${n} ${n === 1 ? 'entrega' : 'entregas'}`)
  if (x) parts.push(`${x} ${x === 1 ? 'examen' : 'exámenes'}`)
  return `Esta semana te ${n + x === 1 ? 'queda' : 'quedan'} ${parts.join(' y ')}.`
}

function Welcome({ onClose }) {
  return (
    <section className="na-card nc-welcome" aria-labelledby="welcome-title">
      <div className="nc-welcome-head">
        <h2 id="welcome-title" className="na-t-title">
          Así funciona NovaClass
        </h2>
        <Button variant="ghost" icon="x" label="Cerrar" onClick={onClose} />
      </div>
      <ol className="nc-steps">
        <li>
          <span className="n">1</span>
          <p>
            <b>Lo siguiente</b> es lo próximo que tienes que entregar o estudiar. Cuando lo entregues, márcalo como hecho.
          </p>
        </li>
        <li>
          <span className="n">2</span>
          <p>
            <b>Cada asignatura tiene su color y su forma</b>, y la verás igual en toda la app:{' '}
            <span className="nc-legend-inline">
              {['pro', 'bd', 'lm', 'si', 'ed'].map(k => (
                <SubjectTag key={k} subject={k} />
              ))}
            </span>
          </p>
        </li>
        <li>
          <span className="n">3</span>
          <p>
            Si algo no te sale, pregunta en <b>Dudas</b>. Si lo has entendido, comparte tus <b>Apuntes</b>.
          </p>
        </li>
      </ol>
      <Button variant="primary" onClick={onClose}>
        Entendido
      </Button>
    </section>
  )
}

function Shortcut({ to, icon, title, text }) {
  return (
    <a className="nc-shortcut" href={href(to)}>
      <span className="ico">
        <Icon name={icon} size={22} />
      </span>
      <span className="txt">
        <b>{title}</b>
        <span>{text}</span>
      </span>
      <Icon name="chevron-right" size={18} />
    </a>
  )
}

function NextHero({ event: n, now, onDone }) {
  const exam = n.type === 'examen'
  return (
    <Hero subject={n.subject} label="Lo siguiente">
      <div className="nc-hero-grid">
        <div>
          <div className="nc-hero-top">
            <span className="na-t-eyebrow">{exam ? 'Lo siguiente · examen' : 'Lo siguiente · entrega'}</span>
            <SubjectTag subject={n.subject} variant="oncolor" showName />
          </div>
          <h2 className="na-t-display nc-hero-title">{n.title}</h2>
          <div className="nc-hero-meta">
            <span>
              <Icon name="clock" size={18} />
              {mediumDate(n.date, n.time)}
            </span>
          </div>
          <div className="nc-hero-actions">
            {exam ? (
              <Button variant="oncolor" subject={n.subject} icon="notes" size="lg" href={href('/apuntes?s=' + n.subject)}>
                Repasar apuntes
              </Button>
            ) : (
              <Button variant="oncolor" subject={n.subject} icon="check" size="lg" onClick={onDone}>
                Marcar como hecha
              </Button>
            )}
            <Button
              variant="ghost"
              iconRight="arrow-right"
              size="lg"
              href={href('/asignaturas/' + n.subject)}
              style={{ color: 'var(--s-on)' }}
              aria-label={'Ir a ' + SUBJECTS[n.subject].name}
            >
              Ir
            </Button>
          </div>
        </div>
        <div className="nc-hero-right">
          <Countdown {...countdown(now, n.at)} size="sm" />
        </div>
      </div>
    </Hero>
  )
}
