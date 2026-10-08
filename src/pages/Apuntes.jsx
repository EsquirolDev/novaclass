import { useRef, useState } from 'react'
import { Avatar, Button, Card, EmptyState, FileBadge, Icon, ListRow, Pill, SubjectTag, Tabs } from '../components/index.js'
import { SUBJECTS, SUBJECT_ORDER } from '../data/subjects.js'
import { checkApunte, sizeLabel } from '../lib/apuntesData.js'
import { useStore } from '../state/store.jsx'

function initialSubject() {
  const q = new URLSearchParams(window.location.hash.split('?')[1] || '')
  return SUBJECTS[q.get('s')] ? q.get('s') : null
}

export default function Apuntes() {
  const { apuntes, addApunte, openApunte } = useStore()
  const [openError, setOpenError] = useState(null)
  const open = a => openApunte(a).catch(() => setOpenError('No se ha podido abrir. Vuelve a intentarlo.'))
  const [subj, setSubj] = useState(initialSubject)
  const [type, setType] = useState(null)

  const filtered = apuntes.filter(a => (!subj || a.subject === subj) && (!type || a.type === type))
  const groups = SUBJECT_ORDER.map(s => {
    const own = filtered.filter(a => a.subject === s)
    const temas = [...new Set(own.map(a => a.tema))].map(t => ({ title: t, items: own.filter(a => a.tema === t) }))
    return { subject: s, temas }
  }).filter(g => g.temas.length)
  const top = [...apuntes].sort((a, b) => b.downloads - a.downloads).slice(0, 3)

  return (
    <div className="nc-screen">
      <div className="nc-split">
        <main className="nc-main nc-main--tight">
          <div className="nc-top">
            <div>
              <h1 className="na-t-display-xl">Apuntes</h1>
              <p className="na-t-subtitle na-muted">{apuntes.length} apuntes compartidos por la clase</p>
            </div>
            <Button variant="primary" icon="upload" size="lg" onClick={() => document.getElementById('up-title')?.focus()}>
              Subir apuntes
            </Button>
          </div>
          <div className="nc-filters">
            <div role="group" aria-label="Asignatura" className="nc-filter-group">
              <Pill toggle selected={!subj} onClick={() => setSubj(null)}>
                Todas
              </Pill>
              {SUBJECT_ORDER.map(k => (
                <Pill key={k} toggle subject={k} selected={subj === k} onClick={() => setSubj(subj === k ? null : k)}>
                  {SUBJECTS[k].code}
                </Pill>
              ))}
            </div>
            <span className="nc-sep" aria-hidden="true" />
            <div role="group" aria-label="Tipo" className="nc-filter-group">
              {[
                ['pdf', 'PDF', 'pdf'],
                ['enlace', 'Enlaces', 'link'],
                ['nota', 'Notas', 'note'],
              ].map(([id, label, icon]) => (
                <Pill key={id} toggle icon={icon} selected={type === id} onClick={() => setType(type === id ? null : id)}>
                  {label}
                </Pill>
              ))}
            </div>
          </div>
          {openError ? (
            <p className="nc-form-err" role="alert" style={{ marginBottom: 16 }}>
              <Icon name="alert" size={18} />
              {openError}
            </p>
          ) : null}
          <div className="nc-sections">
            {groups.length ? (
              groups.map(g => {
                const s = SUBJECTS[g.subject]
                return (
                  <Card key={g.subject} subject={g.subject} as="section" tab={`${s.code} · ${s.name.toUpperCase()}`}>
                    <h2 className="na-sr">{s.name}</h2>
                    {g.temas.map(t => (
                      <div key={t.title} className="nc-tema">
                        <h3>
                          <Icon name="folder" size={18} />
                          {t.title}
                          <span className="na-pill-count">{t.items.length}</span>
                        </h3>
                        {t.items.map(it => (
                          <div key={it.id} className="nc-file-row">
                            <span>
                              <FileBadge type={it.type} />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div className="t">
                                <button type="button" className="nc-linkbtn" onClick={() => open(it)}>
                                  {it.title}
                                </button>
                              </div>
                              <span className="sz">{it.size}</span>
                            </div>
                            <div className="au">
                              <Avatar name={it.author} size={28} me={it.mine} />
                              <span>{it.mine ? 'Tú' : it.author}</span>
                            </div>
                            <span className="dt">{it.date}</span>
                            <Button
                              variant="ghost"
                              icon={it.type === 'pdf' ? 'download' : it.type === 'enlace' ? 'arrow-right' : 'chevron-right'}
                              label={(it.type === 'pdf' ? 'Descargar ' : it.type === 'enlace' ? 'Abrir enlace: ' : 'Leer ') + it.title}
                              onClick={() => open(it)}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </Card>
                )
              })
            ) : (
              <EmptyState
                icon="notes"
                title={apuntes.length ? 'No hay apuntes con estos filtros' : 'Todavía no hay apuntes'}
                action={
                  apuntes.length ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSubj(null)
                        setType(null)
                      }}
                    >
                      Quitar filtros
                    </Button>
                  ) : null
                }
              >
                {apuntes.length ? 'Prueba con otra asignatura u otro tipo.' : 'Sube los tuyos con el formulario de la derecha.'}
              </EmptyState>
            )}
          </div>
        </main>
        <aside className="nc-side nc-side--sticky">
          <UploadCard onPublish={addApunte} />
          <Card title="Los más usados">
            <div className="na-list">
              {top.map((r, i) => (
                <ListRow
                  key={r.id}
                  className="nc-bleed"
                  leading={
                    <span className="na-t-title na-num" style={{ width: 24, textAlign: 'center' }}>
                      {i + 1}
                    </span>
                  }
                  title={r.title}
                  meta={[<SubjectTag key="t" subject={r.subject} />, <span key="n">{r.downloads} descargas</span>]}
                  onClick={() => open(r)}
                />
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function UploadCard({ onPublish }) {
  const fileRef = useRef(null)
  const [upType, setUpType] = useState('pdf')
  const [upSubj, setUpSubj] = useState('bd')
  const [tema, setTema] = useState(0)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [body, setBody] = useState('')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const temas = useStore().temas[upSubj] || []

  function pick(f) {
    if (!f) return
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }
  const problem = checkApunte({ type: upType, title, url, body, file })

  /* Con clase real, espera al servidor (el PDF se sube); si falla, el formulario se queda como estaba */
  async function submit(e) {
    e.preventDefault()
    if (busy) return
    if (problem) return setMsg({ error: problem })
    setBusy(true)
    setMsg(null)
    try {
      await onPublish({
        subject: upSubj,
        tema: temas[tema] ? `Tema ${tema + 1} · ${temas[tema][0]}` : 'Sin tema',
        type: upType,
        title: title.trim(),
        size: upType === 'pdf' ? sizeLabel(file.size) : upType === 'enlace' ? new URL(url).hostname : '1 min de lectura',
        url: upType === 'enlace' ? url.trim() : undefined,
        body: upType === 'nota' ? body.trim() : undefined,
        file: upType === 'pdf' ? file : undefined,
      })
      setTitle('')
      setUrl('')
      setBody('')
      setFile(null)
      setMsg({ ok: `Publicado en ${SUBJECTS[upSubj].code}.` })
    } catch {
      setMsg({ error: 'No se ha podido publicar. Lo que has puesto sigue aquí: vuelve a intentarlo.' })
    }
    setBusy(false)
  }

  return (
    <Card title="Subir apuntes">
      <form onSubmit={submit}>
        <div className="nc-field" style={{ marginTop: 0 }}>
          <span>Tipo</span>
          <Tabs
            label="Tipo de apunte"
            value={upType}
            onChange={setUpType}
            items={[
              { id: 'pdf', label: 'PDF', icon: 'pdf' },
              { id: 'enlace', label: 'Enlace', icon: 'link' },
              { id: 'nota', label: 'Nota', icon: 'note' },
            ]}
          />
        </div>
        {upType === 'pdf' ? (
          <div
            className={'nc-drop' + (drag ? ' is-over' : '')}
            onDragOver={e => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => {
              e.preventDefault()
              setDrag(false)
              pick(e.dataTransfer.files[0])
            }}
          >
            <span className="ico">
              <Icon name="upload" size={26} />
            </span>
            <p className="na-t-subtitle">{file ? file.name : 'Arrastra un PDF aquí'}</p>
            <p className="na-t-label na-muted">{file ? sizeLabel(file.size) : 'máx. 20 MB'}</p>
            <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={e => pick(e.target.files[0])} />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Elegir archivo
            </Button>
          </div>
        ) : null}
        {upType === 'enlace' ? (
          <label className="nc-field">
            <span>Enlace</span>
            <input className="nc-input" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" />
          </label>
        ) : null}
        {upType === 'nota' ? (
          <label className="nc-field">
            <span>Texto</span>
            <small className="na-muted">Una línea por punto. Usa `comillas invertidas` para código y **asteriscos** para resaltar.</small>
            <textarea
              className="nc-textarea-lg"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Lo importante del tema…"
            />
          </label>
        ) : null}
        <label className="nc-field">
          <span>Título</span>
          <input
            id="up-title"
            className="nc-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ej.: Resumen de JOINs"
          />
        </label>
        <div className="nc-field">
          <span>Asignatura</span>
          <div className="nc-chips" role="radiogroup" aria-label="Asignatura">
            {SUBJECT_ORDER.map(k => (
              <Pill
                key={k}
                subject={k}
                selected={upSubj === k}
                role="radio"
                aria-checked={upSubj === k}
                onClick={() => {
                  setUpSubj(k)
                  setTema(0)
                }}
              >
                {SUBJECTS[k].code}
              </Pill>
            ))}
          </div>
        </div>
        <label className="nc-field">
          <span>Tema</span>
          <select className="nc-input" value={tema} onChange={e => setTema(Number(e.target.value))}>
            {temas.map(([t], i) => (
              <option key={i} value={i}>
                Tema {i + 1} · {t}
              </option>
            ))}
          </select>
        </label>
        <div style={{ marginTop: 20 }}>
          <Button variant="primary" type="submit" block icon="check" disabled={busy}>
            {busy ? 'Publicando…' : `Publicar en ${SUBJECTS[upSubj].code}`}
          </Button>
          {msg?.error ? (
            <p className="nc-form-err" role="alert" style={{ marginTop: 12 }}>
              <Icon name="alert" size={18} />
              {msg.error}
            </p>
          ) : null}
          {msg?.ok ? (
            <p className="nc-form-ok" role="status" style={{ marginTop: 12 }}>
              <Icon name="check" size={18} strokeWidth={2.6} />
              {msg.ok}
            </p>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
