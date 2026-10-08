import { useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  Countdown,
  DoneToggle,
  FileBadge,
  Hero,
  Icon,
  ListRow,
  ProgressSegments,
  StatusBadge,
  SubjectTag,
  Tabs,
  VoteCounter,
} from '../components/index.js'
import { TEMAS } from '../data/seed.js'
import { SUBJECTS, subjectVars } from '../data/subjects.js'
import { cx } from '../lib/cx.js'
import { countdown, daysUntil, relative, shortDate } from '../lib/dates.js'
import { href } from '../lib/router.jsx'
import { classesOf, DAY_NAMES, teacherNames, teacherShort, weeklyHours } from '../lib/schedule.js'
import { subjectProgress } from '../state/selectors.js'
import { useStore } from '../state/store.jsx'
import NoEncontrada from './NoEncontrada.jsx'

export default function Asignatura({ id }) {
  const { now, events, dudas, apuntes, setDone } = useStore()
  const [tab, setTab] = useState('entregas')
  const s = SUBJECTS[id]
  if (!s) return <NoEncontrada />

  const p = subjectProgress(events, id, now)
  const entregas = events.filter(e => e.subject === id && e.type === 'entrega')
  const pend = entregas.filter(e => !e.done)
  const done = entregas.filter(e => e.done).reverse()
  const misDudas = dudas.filter(d => d.subject === id)
  const misApuntes = apuntes.filter(a => a.subject === id)

  return (
    <div className="nc-screen">
      <div className="nc-pad">
        <nav className="nc-crumb" aria-label="Ruta">
          <a href={href('/asignaturas')}>
            <Icon name="chevron-left" size={18} />
            Asignaturas
          </a>
          <span aria-hidden="true">/</span>
          <span aria-current="page" style={{ color: 'var(--ink)' }}>
            {s.name}
          </span>
        </nav>
        <Hero subject={id} label={s.name}>
          <div className="nc-subj-head">
            <div>
              <SubjectTag subject={id} variant="oncolor" size="lg" />
              <h1 className="na-t-display-xl">{s.name}</h1>
              <div className="nc-hero-meta">
                <span>
                  <Icon name="user" size={18} />
                  {teacherNames(id).join(' y ')}
                </span>
                <span>
                  <Icon name="clock" size={18} />
                  {weeklyHours(id)} h a la semana
                </span>
                {p.exam ? (
                  <span>
                    <Icon name="flag" size={18} />
                    Próximo examen: {p.exam.title} · {shortDate(p.exam.date).toLowerCase()}
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <div className="nc-score">
                <b className="na-num">
                  {p.done}/{p.total}
                </b>
                <span>
                  entregas
                  <br />
                  hechas
                </span>
              </div>
              <ProgressSegments subject={id} done={p.done} total={p.total} tone="oncolor" hideLabel />
            </div>
          </div>
        </Hero>

        <div className="nc-tabsrow">
          <Tabs
            label="Secciones de la asignatura"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'entregas', label: 'Entregas', icon: 'inbox', count: entregas.length },
              { id: 'apuntes', label: 'Apuntes', icon: 'notes', count: misApuntes.length },
              { id: 'dudas', label: 'Dudas', icon: 'help', count: misDudas.length },
            ]}
          />
          <div className="sp nc-only-desktop">
            <Button variant="secondary" icon="calendar" href={href('/calendario')}>
              Ver en calendario
            </Button>
          </div>
        </div>

        <div className="nc-cols">
          <div>
            {tab === 'entregas' ? (
              <>
                <section className="nc-group">
                  <h2 className="nc-gtitle na-t-title">
                    Pendientes<span className="na-pill-count">{pend.length}</span>
                  </h2>
                  <div className="na-card" style={{ padding: 6 }}>
                    {pend.length ? (
                      pend.map(e => {
                        const soon = daysUntil(now, e.date) <= 2
                        return (
                          <div key={e.id} className="nc-ent">
                            <DoneToggle subject={id} done={false} title={e.title} onChange={v => setDone(e.id, v)} />
                            <div className="main">
                              <div className="t">{e.title}</div>
                              <div className="m">
                                {e.tema ? (
                                  <span>
                                    <Icon name="book" size={14} />
                                    {e.tema}
                                  </span>
                                ) : null}
                                {e.kind ? (
                                  <span>
                                    <Icon name="user" size={14} />
                                    {e.kind}
                                  </span>
                                ) : null}
                                {e.files ? (
                                  <span>
                                    <Icon name="upload" size={14} />
                                    {e.files}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="nc-ent-due">
                              <span className={cx('nc-due', soon && 'soon')} style={subjectVars(id)}>
                                <Icon name="clock" size={14} strokeWidth={2.4} />
                                {shortDate(e.date, e.time)}
                              </span>
                              <span className="na-t-label na-muted">{relative(now, e.date)}</span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="nc-empty">No te queda nada pendiente en {s.code}.</p>
                    )}
                  </div>
                </section>
                <section className="nc-group">
                  <h2 className="nc-gtitle na-t-title">
                    Hechas<span className="na-pill-count">{done.length}</span>
                  </h2>
                  <div className="na-card" style={{ padding: 6 }}>
                    {done.length ? (
                      done.map(e => (
                        <div key={e.id} className="nc-ent is-done">
                          <DoneToggle subject={id} done title={e.title} onChange={v => setDone(e.id, v)} />
                          <div className="main">
                            <div className="t">{e.title}</div>
                            <div className="m">
                              {e.tema ? (
                                <span>
                                  <Icon name="book" size={14} />
                                  {e.tema}
                                </span>
                              ) : null}
                              <span>
                                <Icon name="check" size={14} />
                                Plazo: {shortDate(e.date)}
                              </span>
                            </div>
                          </div>
                          {e.grade ? (
                            <div className="nc-grade">
                              <b>{e.grade}</b>nota
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="nc-empty">Todavía no has marcado ninguna como hecha.</p>
                    )}
                  </div>
                </section>
              </>
            ) : null}

            {tab === 'apuntes' ? (
              <div className="na-card" style={{ padding: 6 }}>
                <div className="na-list na-list--divided">
                  {misApuntes.length ? (
                    misApuntes.map(a => (
                      <ListRow
                        key={a.id}
                        href={a.url || href('/apuntes?s=' + id)}
                        target={a.url ? '_blank' : undefined}
                        rel={a.url ? 'noreferrer' : undefined}
                        leading={<FileBadge type={a.type} />}
                        title={a.title}
                        meta={
                          <>
                            <Avatar name={a.author} size={22} />
                            {a.author} · {a.date} · {a.tema}
                          </>
                        }
                      />
                    ))
                  ) : (
                    <p className="nc-empty">Aún no hay apuntes de {s.code}.</p>
                  )}
                </div>
              </div>
            ) : null}

            {tab === 'dudas' ? (
              <div className="na-card" style={{ padding: 6 }}>
                <div className="na-list na-list--divided">
                  {misDudas.length ? (
                    misDudas.map(d => (
                      <ListRow
                        key={d.id}
                        to={'/dudas/' + d.id}
                        title={d.title}
                        meta={[
                          <VoteCounter key="v" static count={d.votes} />,
                          <StatusBadge key="s" status={d.status} answers={d.answers.length} />,
                        ]}
                        trailing={<Icon name="chevron-right" size={18} />}
                      />
                    ))
                  ) : (
                    <p className="nc-empty">Nadie ha preguntado nada de {s.code} todavía.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="nc-side">
            {p.exam ? (
              <Card subject={id} tab="PRÓXIMO EXAMEN">
                <span className="na-chip na-chip--examen" style={{ width: 'auto', display: 'inline-flex', ...subjectVars(id) }}>
                  <Icon name="flag" size={14} strokeWidth={2.4} />
                  <span className="na-chip-kind">Examen</span>
                  {shortDate(p.exam.date, p.exam.time).toLowerCase()}
                </span>
                <h3 className="na-t-title" style={{ fontSize: 26, margin: '14px 0 8px' }}>
                  {p.exam.title}
                </h3>
                {p.exam.about ? (
                  <p className="na-t-body na-muted" style={{ marginBottom: 18 }}>
                    {p.exam.about}
                  </p>
                ) : null}
                <Countdown {...countdown(now, p.exam.at)} size="sm" />
                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <Button variant="primary" icon="notes" onClick={() => setTab('apuntes')}>
                    Repasar apuntes
                  </Button>
                  <Button variant="secondary" icon="bell" label="Recordatorio" />
                </div>
              </Card>
            ) : null}
            <Card
              title="Clases"
              action={
                <a className="na-link" href={href('/calendario?v=horario')}>
                  Horario
                </a>
              }
            >
              <ul className="nc-classes">
                {classesOf(id).map(b => (
                  <li key={b.day + '-' + b.from}>
                    <b>{DAY_NAMES[b.day]}</b>
                    <span className="na-num">
                      {b.start.replace(/^0/, '')}–{b.end.replace(/^0/, '')}
                    </span>
                    <span className="na-muted">{teacherShort(b.teacher)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Temas">
              <ol className="nc-temas" style={subjectVars(id)}>
                {(TEMAS[id] || []).map(([t, st], i) => (
                  <li key={i} className={st === 'ok' || st === 'now' ? st : ''}>
                    <span className="n">{st === 'ok' ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
                    {t}
                    <span className="st">{st === 'ok' ? 'Visto' : st === 'now' ? 'En curso' : st}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
