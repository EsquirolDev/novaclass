import { useState } from 'react'
import { Button, Card, Icon, ListRow, Pill, StatusBadge, VoteCounter } from '../components/index.js'
import { SUBJECTS, SUBJECT_ORDER, subjectVars } from '../data/subjects.js'
import { href, navigate } from '../lib/router.jsx'
import { useStore } from '../state/store.jsx'

const TITLE_MIN = 10
const TITLE_MAX = 140
const BODY_MIN = 20
const TAGS_MAX = 3

/* Palabras de 4+ letras, sin tildes, para buscar dudas parecidas al título */
function words(text) {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[a-z0-9]{4,}/g) || []
  )
}

/* Pregunta general: con explicación, código y etiquetas. La rápida está en la lista de Dudas. */
export default function DudaNueva() {
  const { dudas, addDuda } = useStore()
  const [subject, setSubject] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [code, setCode] = useState('')
  const [tags, setTags] = useState('')
  const [tried, setTried] = useState(false)

  const tagList = [
    ...new Set(
      tags
        .split(',')
        .map(t => t.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean),
    ),
  ]
  const errors = {
    subject: !subject && 'Elige la asignatura.',
    title: title.trim().length < TITLE_MIN && `El título necesita al menos ${TITLE_MIN} caracteres.`,
    body: body.trim().length < BODY_MIN && `Cuéntalo un poco más (mínimo ${BODY_MIN} caracteres).`,
    tags: tagList.length > TAGS_MAX && `Máximo ${TAGS_MAX} etiquetas.`,
  }
  const valid = !Object.values(errors).some(Boolean)

  const titleWords = words(title)
  const similar = titleWords.length
    ? dudas
        .map(d => ({ d, score: words(d.title + ' ' + d.tags.join(' ')).filter(w => titleWords.includes(w)).length }))
        .filter(x => x.score > 0 && (!subject || x.d.subject === subject))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(x => x.d)
    : []

  function submit(e) {
    e.preventDefault()
    setTried(true)
    if (!valid) return
    const id = addDuda({ kind: 'general', subject, title: title.trim(), body: body.trim(), code: code.replace(/\s+$/, ''), tags: tagList })
    navigate('/dudas/' + id)
  }

  const err = k =>
    tried && errors[k] ? (
      <span className="nc-err" id={'err-' + k}>
        {errors[k]}
      </span>
    ) : null

  return (
    <div className="nc-screen">
      <div className="nc-split">
        <main className="nc-main nc-main--tight">
          <nav className="nc-crumb" aria-label="Ruta">
            <a href={href('/dudas')}>
              <Icon name="chevron-left" size={18} />
              Todas las dudas
            </a>
          </nav>
          <div className="nc-top">
            <div>
              <h1 className="na-t-display-xl">Nueva pregunta</h1>
              <p className="na-t-subtitle na-muted">Explica qué intentas hacer y qué te pasa. Cuanto más claro, antes te responden.</p>
            </div>
          </div>

          <form className="na-card nc-form" onSubmit={submit} noValidate style={subjectVars(subject)}>
            <fieldset className="nc-field">
              <legend>Asignatura</legend>
              <div className="nc-chips" role="radiogroup" aria-label="Asignatura">
                {SUBJECT_ORDER.map(k => (
                  <Pill
                    key={k}
                    subject={k}
                    selected={subject === k}
                    role="radio"
                    aria-checked={subject === k}
                    onClick={() => setSubject(k)}
                  >
                    {SUBJECTS[k].code}
                    <span className="nc-pill-name">{SUBJECTS[k].name}</span>
                  </Pill>
                ))}
              </div>
              {err('subject')}
            </fieldset>

            <label className="nc-field">
              <span>Título</span>
              <small className="na-muted">La pregunta en una frase, como la buscaría otra persona.</small>
              <input
                className="nc-input"
                value={title}
                maxLength={TITLE_MAX}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej.: ¿Por qué mi consulta con GROUP BY da error de columna?"
                aria-invalid={!!(tried && errors.title)}
                aria-describedby="err-title"
              />
              <span className="nc-count na-num">
                {title.length}/{TITLE_MAX}
              </span>
              {err('title')}
            </label>

            <label className="nc-field">
              <span>Explicación</span>
              <small className="na-muted">
                Qué intentabas hacer, qué has probado y qué error o resultado te sale. Usa `comillas invertidas` para código corto.
              </small>
              <textarea
                className="nc-textarea-lg"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="En la práctica de la biblioteca tengo que… He probado… y me sale…"
                aria-invalid={!!(tried && errors.body)}
                aria-describedby="err-body"
              />
              {err('body')}
            </label>

            <label className="nc-field">
              <span>
                Código <em className="na-muted">(opcional)</em>
              </span>
              <small className="na-muted">Pega solo el trozo que falla.</small>
              <textarea
                className="nc-code-input"
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                placeholder={'SELECT ...\nFROM ...'}
              />
            </label>

            <label className="nc-field">
              <span>
                Etiquetas <em className="na-muted">(opcional)</em>
              </span>
              <small className="na-muted">Hasta {TAGS_MAX}, separadas por comas.</small>
              <input
                className="nc-input"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="joins, práctica biblioteca"
                aria-describedby="err-tags"
              />
              {tagList.length ? (
                <div className="nc-chips" style={{ marginTop: 10 }}>
                  {tagList.map(t => (
                    <span key={t} className="nc-kw">
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
              {err('tags')}
            </label>

            <div className="nc-form-actions">
              <Button variant="ghost" href={href('/dudas')}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" icon="check">
                Publicar pregunta
              </Button>
            </div>
          </form>
        </main>

        <aside className="nc-side nc-side--offset">
          {similar.length ? (
            <Card title="¿Ya está preguntado?">
              <p className="na-t-label na-muted" style={{ marginBottom: 6 }}>
                Dudas parecidas a tu título:
              </p>
              <div className="na-list">
                {similar.map(d => (
                  <ListRow
                    key={d.id}
                    to={'/dudas/' + d.id}
                    className="nc-bleed"
                    title={d.title}
                    meta={[
                      <VoteCounter key="v" static count={d.votes} />,
                      <StatusBadge key="s" status={d.status} answers={d.answers.length} />,
                    ]}
                  />
                ))}
              </div>
            </Card>
          ) : null}
          <Card title="Una buena pregunta">
            <ol className="nc-steps nc-steps--sm">
              <li>
                <span className="n">1</span>
                <p>Un título que se entienda sin abrir la duda.</p>
              </li>
              <li>
                <span className="n">2</span>
                <p>Qué esperabas que pasara y qué pasa en realidad.</p>
              </li>
              <li>
                <span className="n">3</span>
                <p>El código justo para reproducirlo, no la práctica entera.</p>
              </li>
            </ol>
            <p className="na-t-label na-muted" style={{ marginTop: 16 }}>
              ¿Es algo de una línea, como una fecha o un aula? Usa la{' '}
              <a className="nc-inline-link" href={href('/dudas')}>
                pregunta rápida
              </a>
              .
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}
