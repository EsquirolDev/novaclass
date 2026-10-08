import { useEffect } from 'react'
import { Avatar, Button, EmptyState, FileBadge, Icon, SubjectTag } from '../components/index.js'
import { Paragraphs } from '../components/RichText.jsx'
import { subjectVars } from '../data/subjects.js'
import { href } from '../lib/router.jsx'
import { useStore } from '../state/store.jsx'
import NoEncontrada from './NoEncontrada.jsx'

/* Leer una nota (los PDF y enlaces se abren en otra pestaña desde la lista). Abrirla cuenta como lectura. */
export default function ApunteVer({ id }) {
  const { apuntes, countApunte, openApunte } = useStore()
  const a = apuntes.find(x => String(x.id) === id)
  useEffect(() => {
    if (a?.type === 'nota') countApunte(a.id)
  }, [a?.id, a?.type, countApunte])
  if (!a) return <NoEncontrada />

  return (
    <div className="nc-screen">
      <main className="nc-pad nc-nota" style={subjectVars(a.subject)}>
        <nav className="nc-crumb" aria-label="Ruta">
          <a href={href('/apuntes' + (a.subject ? '?s=' + a.subject : ''))}>
            <Icon name="chevron-left" size={18} />
            Apuntes
          </a>
        </nav>
        <header className="nc-nota-head">
          <div className="tags">
            {a.subject ? <SubjectTag subject={a.subject} showName /> : null}
            <FileBadge type={a.type} />
            <span className="na-t-label na-muted">{a.tema}</span>
          </div>
          <h1 className="na-t-display">{a.title}</h1>
          <p className="by">
            <Avatar name={a.author} size={28} me={a.mine} />
            <b>{a.mine ? 'Tú' : a.author}</b>
            <span className="na-muted">
              · {a.date} · {a.size}
            </span>
          </p>
        </header>
        {a.type === 'nota' ? (
          <article className="na-card nc-nota-body">
            {a.body ? <Paragraphs text={a.body} /> : <p className="na-muted">Esta nota está vacía.</p>}
          </article>
        ) : (
          <EmptyState
            icon={a.type === 'pdf' ? 'download' : 'link'}
            title={a.type === 'pdf' ? 'Es un PDF' : 'Es un enlace'}
            className="nc-state-card"
            action={
              <Button variant="primary" icon={a.type === 'pdf' ? 'download' : 'link'} onClick={() => openApunte(a)}>
                {a.type === 'pdf' ? 'Abrir el PDF' : 'Abrir el enlace'}
              </Button>
            }
          >
            Se abre en otra pestaña.
          </EmptyState>
        )}
      </main>
    </div>
  )
}
