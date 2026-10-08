import { useState } from 'react'
import { Avatar, Button, Card, FileBadge, Icon, ListRow, StatusBadge, SubjectTag, Tabs, VoteCounter } from '../components/index.js'
import { CodeBlock, Paragraphs } from '../components/RichText.jsx'
import { subjectVars } from '../data/subjects.js'
import { cx } from '../lib/cx.js'
import { shortDate } from '../lib/dates.js'
import { href } from '../lib/router.jsx'
import { useStore } from '../state/store.jsx'
import NoEncontrada from './NoEncontrada.jsx'

function Post({ voteKey, votes, myVote, author, teacher, when, children }) {
  const { user, vote } = useStore()
  return (
    <div className="nc-post">
      <VoteCounter count={votes} voted={myVote} onUp={() => vote(voteKey, 'up')} onDown={() => vote(voteKey, 'down')} />
      <div style={{ minWidth: 0 }}>
        {children}
        <div className="by">
          <Avatar name={author} size={32} me={author === user} />
          <b>{author === user ? 'Tú' : author}</b>
          {teacher ? <span className="nc-teacher">Profe</span> : null}· {when}
        </div>
      </div>
    </div>
  )
}

export default function Duda({ id }) {
  const { user, now, dudas, events, apuntes, addAnswer, acceptAnswer } = useStore()
  const [order, setOrder] = useState('votos')
  const [text, setText] = useState('')
  const d = dudas.find(x => String(x.id) === id)
  if (!d) return <NoEncontrada />

  const isMine = d.author === user
  const answers = [...d.answers].sort((a, b) => {
    if (a.id === d.accepted) return -1
    if (b.id === d.accepted) return 1
    return order === 'votos' ? b.votes - a.votes : 0
  })
  if (order === 'rec') answers.reverse()
  const exam = events.find(e => e.subject === d.subject && e.type === 'examen' && !e.done && e.at > now)
  const apunte = apuntes.find(a => a.subject === d.subject)
  const parecidas = dudas.filter(x => x.subject === d.subject && x.id !== d.id).slice(0, 3)

  function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    addAnswer(d.id, text.trim())
    setText('')
  }

  return (
    <div className="nc-screen">
      <div className="nc-split">
        <main className="nc-main nc-main--tight" style={subjectVars(d.subject)}>
          <nav className="nc-crumb" aria-label="Ruta">
            <a href={href('/dudas')}>
              <Icon name="chevron-left" size={18} />
              Todas las dudas
            </a>
          </nav>
          <header className="nc-qhead">
            <div className="tags">
              <SubjectTag subject={d.subject} variant="solid" showName />
              <StatusBadge status={d.status} answers={d.answers.length} />
              {d.kind === 'rapida' ? (
                <span className="nc-kw nc-kw--quick">
                  <Icon name="message" size={13} strokeWidth={2.4} />
                  Pregunta rápida
                </span>
              ) : null}
              <span className="na-t-label na-muted">
                Preguntada {d.when} · {d.views} visitas
              </span>
            </div>
            <h1 className="na-t-display">{d.title}</h1>
          </header>
          <article className="na-card na-card--flush">
            <Post voteKey={d.id} votes={d.votes} myVote={d.myVote} author={d.author} when={d.when}>
              {d.body ? <Paragraphs text={d.body} /> : null}
              {d.code ? <CodeBlock code={d.code} /> : null}
              {d.tags.length ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  {d.tags.map(t => (
                    <span key={t} className="nc-kw">
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
            </Post>
          </article>

          <div className="nc-ansbar">
            <h2 className="na-t-title">
              {d.answers.length} {d.answers.length === 1 ? 'respuesta' : 'respuestas'}
            </h2>
            {d.answers.length > 1 ? (
              <Tabs
                label="Ordenar"
                value={order}
                onChange={setOrder}
                items={[
                  { id: 'votos', label: 'Más votadas' },
                  { id: 'rec', label: 'Recientes' },
                ]}
              />
            ) : null}
          </div>
          <div className="nc-answers">
            {answers.map(a => {
              const acc = a.id === d.accepted
              return (
                <article
                  key={a.id}
                  className={cx('na-card', 'na-card--flush', acc && 'nc-accepted')}
                  aria-label={acc ? 'Respuesta aceptada' : undefined}
                >
                  {acc ? (
                    <div className="nc-acc-flag">
                      <Icon name="check" size={16} strokeWidth={3} />
                      Respuesta aceptada<span>La marcó quien preguntó</span>
                    </div>
                  ) : null}
                  <Post voteKey={`${d.id}:${a.id}`} votes={a.votes} myVote={a.myVote} author={a.author} teacher={a.teacher} when={a.when}>
                    <Paragraphs text={a.body} />
                    {a.code ? <CodeBlock code={a.code} /> : null}
                    {a.after ? <Paragraphs text={a.after} /> : null}
                    {isMine && !acc ? (
                      <Button variant="secondary" icon="check" onClick={() => acceptAnswer(d.id, a.id)} style={{ marginBottom: 8 }}>
                        Aceptar esta respuesta
                      </Button>
                    ) : null}
                  </Post>
                </article>
              )
            })}
            {!d.answers.length ? <p className="nc-empty">Nadie ha respondido todavía. ¿Te animas?</p> : null}
          </div>

          <form className="na-card nc-reply" onSubmit={send}>
            <label htmlFor="rep">Tu respuesta</label>
            <textarea
              id="rep"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Explícalo como se lo explicarías a alguien de clase. Puedes pegar código."
            />
            <div className="row">
              <span className="na-t-label na-muted">Usa `comillas invertidas` para el código</span>
              <Button variant="primary" icon="message" type="submit" disabled={!text.trim()}>
                Responder
              </Button>
            </div>
          </form>
        </main>

        <aside className="nc-side nc-side--offset">
          {exam || apunte ? (
            <Card subject={d.subject} tab="RELACIONADO">
              {exam ? (
                <>
                  <p className="na-t-eyebrow na-muted" style={{ marginBottom: 8 }}>
                    Examen
                  </p>
                  <p className="na-t-subtitle" style={{ marginBottom: 4 }}>
                    {exam.title}
                  </p>
                  <p className="na-t-label na-muted" style={{ marginBottom: 14 }}>
                    {shortDate(exam.date, exam.time)}–{exam.end}
                  </p>
                </>
              ) : null}
              {apunte ? (
                <>
                  <p className="na-t-eyebrow na-muted" style={{ margin: '18px 0 2px' }}>
                    Apuntes
                  </p>
                  <ListRow
                    href={href('/apuntes?s=' + d.subject)}
                    className="nc-bleed"
                    leading={<FileBadge type={apunte.type} />}
                    title={apunte.title}
                    meta={`${apunte.author} · ${apunte.date}`}
                  />
                </>
              ) : null}
            </Card>
          ) : null}
          {parecidas.length ? (
            <Card title="Dudas parecidas">
              <div className="na-list">
                {parecidas.map(x => (
                  <ListRow
                    key={x.id}
                    to={'/dudas/' + x.id}
                    className="nc-bleed"
                    title={x.title}
                    meta={[
                      <VoteCounter key="v" static count={x.votes} />,
                      <StatusBadge key="s" status={x.status} answers={x.answers.length} />,
                    ]}
                  />
                ))}
              </div>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
