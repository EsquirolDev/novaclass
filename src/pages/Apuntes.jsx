import { useRef, useState } from 'react'
import { Avatar, Button, Card, EmptyState, FileBadge, Icon, ListRow, Pill, SubjectTag, Tabs } from '../components/index.js'
import { SUBJECTS, SUBJECT_ORDER } from '../data/subjects.js'
import { useStore } from '../state/store.jsx'

function initialSubject() {
  const q = new URLSearchParams(window.location.hash.split('?')[1] || '')
  return SUBJECTS[q.get('s')] ? q.get('s') : null
}

function sizeLabel(bytes) {
  return bytes > 1e6 ? (bytes / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.round(bytes / 1e3) + ' KB'
}

export default function Apuntes() {
  const { user, apuntes, addApunte } = useStore()
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
                                {it.url ? (
                                  <a href={it.url} target="_blank" rel="noreferrer">
                                    {it.title}
                                  </a>
                                ) : (
                                  it.title
                                )}
                              </div>
                              <span className="sz">{it.size}</span>
                            </div>
                            <div className="au">
                              <Avatar name={it.author} size={28} me={it.author === user} />
                              <span>{it.author === user ? 'Tú' : it.author}</span>
                            </div>
                            <span className="dt">{it.date}</span>
                            {it.url ? (
                              <Button
                                variant="ghost"
                                icon="arrow-right"
                                label={'Abrir ' + it.title}
                                href={it.url}
                                target="_blank"
                                rel="noreferrer"
                              />
                            ) : (
                              <Button
                                variant="ghost"
                                icon={it.type === 'pdf' ? 'download' : 'chevron-right'}
                                label={(it.type === 'pdf' ? 'Descargar ' : 'Abrir ') + it.title}
                              />
                            )}
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
  const [drag, setDrag] = useState(false)
  const temas = useStore().temas[upSubj] || []

  function pick(f) {
    if (!f) return
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }
  const ready = title.trim() && (upType === 'nota' || (upType === 'enlace' ? /^https?:\/\//.test(url) : file))

  function submit(e) {
    e.preventDefault()
    if (!ready) return
    onPublish({
      subject: upSubj,
      tema: `Tema ${tema + 1} · ${temas[tema]?.[0] || ''}`,
      type: upType,
      title: title.trim(),
      size: upType === 'pdf' ? sizeLabel(file.size) : upType === 'enlace' ? new URL(url).hostname : '1 min de lectura',
      url: upType === 'enlace' ? url : undefined,
    })
    setTitle('')
    setUrl('')
    setFile(null)
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
          <Button variant="primary" type="submit" block icon="check" disabled={!ready}>
            Publicar en {SUBJECTS[upSubj].code}
          </Button>
        </div>
      </form>
    </Card>
  )
}
