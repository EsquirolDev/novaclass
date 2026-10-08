import { Card, Icon, ProgressSegments } from '../components/index.js'
import { SUBJECTS } from '../data/subjects.js'
import { shortDate } from '../lib/dates.js'
import { href } from '../lib/router.jsx'
import { teacherNames, weeklyHours } from '../lib/schedule.js'
import { allProgress } from '../state/selectors.js'
import { useStore } from '../state/store.jsx'

export default function Asignaturas() {
  const { now, events } = useStore()
  const progress = allProgress(events, now)
  return (
    <div className="nc-screen">
      <main className="nc-pad">
        <div className="nc-top">
          <div>
            <h1 className="na-t-display-xl">Asignaturas</h1>
            <p className="na-t-subtitle na-muted">Las asignaturas de tu clase. Cada una con su color, su forma y su código.</p>
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
      </main>
    </div>
  )
}
