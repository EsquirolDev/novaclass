import { Card, EmptyState, Icon, JoinForm, ProgressSegments, SubjectTag } from '../components/index.js'
import { SUBJECTS } from '../data/subjects.js'
import { shortDate } from '../lib/dates.js'
import { href } from '../lib/router.jsx'
import { teacherNames, weeklyHours } from '../lib/schedule.js'
import { useClase } from '../state/clase.jsx'
import { allProgress } from '../state/selectors.js'
import { useStore } from '../state/store.jsx'

export default function Asignaturas() {
  const { now, events } = useStore()
  const { locked = [] } = useClase()
  const progress = allProgress(events, now)
  return (
    <div className="nc-screen">
      <main className="nc-pad">
        <div className="nc-top">
          <div>
            <h1 className="na-t-display-xl">Asignaturas</h1>
            <p className="na-t-subtitle na-muted">Las asignaturas de tu curso. Cada una con su color, su forma y su código.</p>
          </div>
        </div>
        <div className="nc-subjects">
          {progress.map(p => {
            const s = SUBJECTS[p.subject]
            return (
              <a key={p.subject} href={href('/asignaturas/' + p.subject)} className="nc-cardlink">
                <Card subject={p.subject} as="article" tab={`${s.code} · ${s.name.toUpperCase()}`}>
                  <h2 className="na-t-title" style={{ marginBottom: 6 }}>
                    {s.name}
                  </h2>
                  <p className="na-t-label na-muted nc-meta-line">
                    <span>
                      <Icon name="user" size={15} />
                      {teacherNames(p.subject).join(' y ')}
                    </span>
                    <span>
                      <Icon name="clock" size={15} />
                      {weeklyHours(p.subject)} h a la semana
                    </span>
                  </p>
                  <div className="nc-subj-next">
                    {p.next ? (
                      <>
                        <span className="when">
                          <Icon name={p.next.type === 'examen' ? 'flag' : 'inbox'} size={15} strokeWidth={2.4} />
                          {(p.next.type === 'examen' ? 'Examen · ' : 'Próxima entrega · ') + shortDate(p.next.date)}
                        </span>
                        <span className="what">{p.next.title}</span>
                      </>
                    ) : (
                      <span className="when">Nada pendiente</span>
                    )}
                  </div>
                  <ProgressSegments subject={p.subject} done={p.done} total={p.total} label="Hechas" />
                </Card>
              </a>
            )
          })}
        </div>
        {!progress.length && !locked.length ? (
          <EmptyState icon="book" title="Aún no hay asignaturas abiertas" className="nc-state-card">
            Cuando quien da cada asignatura abra su espacio (entregas, apuntes y dudas), saldrá aquí.
          </EmptyState>
        ) : null}
        {locked.length ? (
          <section className="nc-group nc-locked-group" aria-labelledby="sin-entrar">
            <h2 className="nc-gtitle na-t-title" id="sin-entrar">
              Aún no has entrado<span className="na-pill-count">{locked.length}</span>
            </h2>
            <div className="na-card nc-locked-card">
              <div className="nc-locked">
                {locked.map(id => (
                  <SubjectTag key={id} subject={id} showName />
                ))}
              </div>
              <JoinForm />
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
