import { useState } from 'react'
import { Avatar, Button, Card, EmptyState, Icon, Pill, StatusBadge, SubjectTag, Tabs } from '../components/index.js'
import { SUBJECTS, SUBJECT_ORDER } from '../data/subjects.js'
import { cx } from '../lib/cx.js'
import { href } from '../lib/router.jsx'
import { useStore } from '../state/store.jsx'

export default function Dudas() {
  const { user, dudas } = useStore()
  const [subj, setSubj] = useState(null)
  const [st, setSt] = useState('todas')

  const bySubj = dudas.filter(d => !subj || d.subject === subj)
  const list = bySubj.filter(d => st === 'todas' || (st === 'sin' ? d.status === 'sin-responder' : d.status === 'resuelta'))
  const sinCount = bySubj.filter(d => d.status === 'sin-responder').length
  const resCount = bySubj.filter(d => d.status === 'resuelta').length
  const mine = dudas.reduce((n, d) => n + d.answers.filter(a => a.author === user).length, 0)

  return (
    <div className="nc-screen">
      <div className="nc-split">
        <main className="nc-main nc-main--tight">
          <div className="nc-top">
            <div>
              <h1 className="na-t-display-xl">Dudas</h1>
              <p className="na-t-subtitle na-muted">Pregunta a la clase. Si lo has entendido, explícalo.</p>
            </div>
            <Button variant="primary" icon="plus" size="lg" href={href('/dudas/nueva')}>
              Nueva pregunta
            </Button>
          </div>
          <div className="nc-filters" role="group" aria-label="Filtrar por asignatura">
            <Pill toggle selected={!subj} onClick={() => setSubj(null)}>
              Todas
            </Pill>
            <span className="nc-sep" aria-hidden="true" />
            {SUBJECT_ORDER.map(k => (
              <Pill
                key={k}
                toggle
                subject={k}
                selected={subj === k}
                count={dudas.filter(d => d.subject === k).length}
                onClick={() => setSubj(subj === k ? null : k)}
              >
                {SUBJECTS[k].code}
              </Pill>
            ))}
          </div>
          <div className="nc-sub">
            <Tabs
              label="Estado"
              value={st}
              onChange={setSt}
              items={[
                { id: 'todas', label: 'Recientes' },
                { id: 'sin', label: 'Sin responder', count: sinCount },
                { id: 'res', label: 'Resueltas', count: resCount },
              ]}
            />
            <span className="na-t-label na-muted">
              {list.length} {list.length === 1 ? 'duda' : 'dudas'}
            </span>
          </div>
          <div className="na-card na-card--flush">
            {list.length ? (
              list.map(d => {
                const res = d.status === 'resuelta'
                const n = d.answers.length
                return (
                  <article key={d.id} className="nc-q">
                    <div className="nc-stat votes" aria-label={d.votes + ' votos'}>
                      <b>{d.votes}</b>votos
                    </div>
                    <div
                      className={cx('nc-stat', 'ans', res && 'res', n === 0 && 'none')}
                      aria-label={n + ' respuestas' + (res ? ', resuelta' : '')}
                    >
                      <b>
                        {res ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Icon name="check" size={16} strokeWidth={3} />
                            {n}
                          </span>
                        ) : (
                          n
                        )}
                      </b>
                      {n === 1 ? 'respuesta' : 'respuestas'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2>
                        <a href={href('/dudas/' + d.id)}>{d.title}</a>
                      </h2>
                      {d.body ? <p>{d.body.replace(/`/g, '')}</p> : null}
                      <div className="meta">
                        <SubjectTag subject={d.subject} />
                        {d.status !== 'abierta' ? <StatusBadge status={d.status} answers={n} /> : null}
                        {d.tags.map(k => (
                          <span key={k} className="nc-kw">
                            #{k}
                          </span>
                        ))}
                        <span className="by">
                          <Avatar name={d.author} size={26} me={d.author === user} />
                          <b>{d.author === user ? 'Tú' : d.author}</b>
                          {d.when}
                        </span>
                      </div>
                    </div>
                  </article>
                )
              })
            ) : (
              <EmptyState
                icon="help"
                title={dudas.length ? 'No hay dudas con estos filtros' : 'Todavía no hay dudas'}
                action={
                  dudas.length ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSubj(null)
                        setSt('todas')
                      }}
                    >
                      Quitar filtros
                    </Button>
                  ) : (
                    <Button variant="primary" icon="plus" href={href('/dudas/nueva')}>
                      Hacer la primera pregunta
                    </Button>
                  )
                }
              >
                {dudas.length ? 'Prueba con otra asignatura o con todas.' : 'Si algo no te sale, seguro que a alguien más tampoco.'}
              </EmptyState>
            )}
          </div>
        </main>
        <aside className="nc-side">
          <Card title="En clase">
            <div className="nc-stats">
              <div>
                <b>{dudas.length}</b>dudas
              </div>
              <div>
                <b>{dudas.filter(d => d.status === 'resuelta').length}</b>resueltas
              </div>
              <div>
                <b>{mine}</b>respuestas tuyas
              </div>
              <div>
                <b>{dudas.filter(d => d.status === 'sin-responder').length}</b>sin responder
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
