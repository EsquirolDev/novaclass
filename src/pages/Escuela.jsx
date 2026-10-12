import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Button, Card, EmptyState, ErrorState, Icon, LoadingState, PasswordReset, Pill, Tabs } from '../components/index.js'
import { parseList, toTsv } from '../lib/cuentas.js'
import { pb } from '../lib/pb.js'
import { useAuth } from '../state/auth.jsx'
import { useClase } from '../state/clase.jsx'
import NoEncontrada from './NoEncontrada.jsx'

/*
 * Cuentas de la escuela (solo la dirección): crear cuentas de una en una o pegando una lista, ver las recién creadas
 * con su contraseña temporal (solo esa vez: se copian o se imprimen) y dar una contraseña nueva a quien la olvide.
 * Rutas: pb_hooks/cuentas.pb.js. Las cuentas salen con usuario@escuela y hay que cambiar la contraseña al entrar.
 */
async function loadEscuela(schoolId) {
  const [school, cursos, users, alumnos] = await Promise.all([
    pb.collection('schools').getOne(schoolId),
    pb.collection('cursos').getFullList({ filter: pb.filter('school = {:s}', { s: schoolId }), sort: 'name' }),
    pb.collection('users').getFullList({ filter: pb.filter('school = {:s}', { s: schoolId }), sort: 'apellidos,nombre' }),
    pb.collection('curso_alumnos').getFullList({ filter: pb.filter('curso.school = {:s} && baja = false', { s: schoolId }) }),
  ])
  /* El NIA está oculto en la API: cada curso lo da por su ruta (dirección y Tutor) */
  const nias = Object.assign({}, ...(await Promise.all(cursos.map(c => pb.send(`/api/novaclass/cursos/${c.id}/nias`, { method: 'GET' })))))
  return { school, cursos, users, cursoOf: Object.fromEntries(alumnos.map(a => [a.user, a.curso])), nias }
}

export default function Escuela() {
  const { staffSchool } = useClase()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [created, setCreated] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!staffSchool) return undefined
    let alive = true
    setError(null)
    loadEscuela(staffSchool).then(
      d => alive && setData(d),
      e => alive && setError(e),
    )
    return () => {
      alive = false
    }
  }, [staffSchool, reload])

  const crear = useCallback(async people => {
    const res = await pb.send('/api/novaclass/cuentas', { method: 'POST', body: { people } })
    setCreated(res.created)
    setReload(n => n + 1)
    return res.created
  }, [])

  if (!staffSchool) return <NoEncontrada />
  if (error)
    return (
      <div className="nc-screen">
        <main className="nc-pad nc-state-page">
          <h1 className="na-sr">Cuentas de la escuela</h1>
          <ErrorState title="No se han podido cargar las cuentas" onRetry={() => setReload(n => n + 1)}>
            Vuelve a intentarlo en un momento.
          </ErrorState>
        </main>
      </div>
    )
  if (!data) return <LoadingState label="Cargando las cuentas…" />
  const cursoName = id => data.cursos.find(c => c.id === id)?.name || ''

  return (
    <div className="nc-screen">
      <main className="nc-pad nc-escuela">
        <div className="nc-top">
          <div>
            <p className="na-t-eyebrow na-muted nc-clase-school">
              {data.school.name}
              {data.school.verified ? <Icon name="shield" size={15} label="Escuela verificada" /> : null}
            </p>
            <h1 className="na-t-display-xl">Cuentas de la escuela</h1>
            <p className="na-t-subtitle na-muted">
              {data.users.length} {data.users.length === 1 ? 'persona' : 'personas'} · {data.cursos.length}{' '}
              {data.cursos.length === 1 ? 'curso' : 'cursos'} · usuarios @{data.school.slug}
            </p>
          </div>
        </div>
        {created ? <Creadas created={created} cursoName={cursoName} onClose={() => setCreated(null)} /> : null}
        <div className="nc-clase-grid">
          <div className="nc-clase-people">
            <Alta cursos={data.cursos} onCreate={crear} slug={data.school.slug} />
            <Personas data={data} me={user?.id} cursoName={cursoName} />
          </div>
          <aside className="nc-side">
            <Card title="Cómo funciona">
              <ol className="nc-howto">
                <li>Creas las cuentas: una persona o la lista entera de un curso.</li>
                <li>
                  Cada una sale con su usuario (inicial del nombre, primer apellido e inicial del segundo: <b>scollp@{data.school.slug}</b>)
                  y una contraseña temporal.
                </li>
                <li>Las pasas impresas o copiadas: solo se ven al crearlas.</li>
                <li>Al entrar por primera vez, cada uno pone su contraseña. Si la olvida, el Tutor o la dirección le dan otra.</li>
              </ol>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  )
}

/* Rol (y curso, si es Estudiante): lo comparten el alta de una persona y la de una lista */
function RolCurso({ role, setRole, curso, setCurso, cursos }) {
  return (
    <>
      <div className="nc-field">
        <span>Es</span>
        <div className="nc-chips" role="radiogroup" aria-label="Es">
          {[
            ['estudiante', 'Estudiante'],
            ['docente', 'Docente'],
          ].map(([v, l]) => (
            <Pill key={v} selected={role === v} role="radio" aria-checked={role === v} onClick={() => setRole(v)}>
              {l}
            </Pill>
          ))}
        </div>
      </div>
      {role === 'estudiante' ? (
        <label className="nc-field">
          <span>Curso</span>
          <select className="nc-input" value={curso} onChange={e => setCurso(e.target.value)}>
            <option value="">Elige el curso…</option>
            {cursos.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.course}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  )
}

function serverError(err) {
  if (err?.status === 0) return 'No se puede conectar con el servidor.'
  return err?.response?.message || 'No se han podido crear las cuentas.'
}

function Alta({ cursos, onCreate, slug }) {
  const [tab, setTab] = useState('una')
  const [role, setRole] = useState('estudiante')
  const [curso, setCurso] = useState(cursos.length === 1 ? cursos[0].id : '')
  return (
    <Card title="Añadir cuentas">
      <Tabs
        label="Cómo añadir"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'una', label: 'Una persona', icon: 'user' },
          { id: 'lista', label: 'Una lista', icon: 'users' },
        ]}
      />
      <div className="nc-form nc-alta">
        <RolCurso role={role} setRole={setRole} curso={curso} setCurso={setCurso} cursos={cursos} />
        {role === 'estudiante' && !cursos.length ? (
          <p className="nc-form-err" style={{ marginTop: 16 }}>
            <Icon name="alert" size={18} />
            Aún no hay cursos en la escuela: créalos primero para poner en ellos al alumnado.
          </p>
        ) : tab === 'una' ? (
          <UnaPersona role={role} curso={curso} onCreate={onCreate} slug={slug} />
        ) : (
          <Lista role={role} curso={curso} onCreate={onCreate} />
        )}
      </div>
    </Card>
  )
}

function UnaPersona({ role, curso, onCreate, slug }) {
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [nia, setNia] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!nombre.trim() || !apellidos.trim()) return setErr('Escribe el nombre y los apellidos.')
    if (role === 'estudiante' && !curso) return setErr('Elige su curso.')
    setBusy(true)
    setErr(null)
    try {
      await onCreate([{ nombre, apellidos, nia, role, curso: role === 'estudiante' ? curso : '' }])
      setNombre('')
      setApellidos('')
      setNia('')
    } catch (error) {
      setErr(error?.response?.data?.rows?.[0]?.error || serverError(error))
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="nc-alta-row">
        <label className="nc-field">
          <span>Nombre</span>
          <input className="nc-input" value={nombre} maxLength={60} onChange={e => setNombre(e.target.value)} autoComplete="off" />
        </label>
        <label className="nc-field">
          <span>Apellidos</span>
          <input className="nc-input" value={apellidos} maxLength={80} onChange={e => setApellidos(e.target.value)} autoComplete="off" />
        </label>
      </div>
      <label className="nc-field">
        <span>NIA (ID del centro)</span>
        <small className="na-muted">Opcional. Solo lo ven la dirección y su Tutor.</small>
        <input className="nc-input" value={nia} maxLength={30} onChange={e => setNia(e.target.value)} autoComplete="off" />
      </label>
      <div className="nc-alta-submit">
        <Button variant="primary" type="submit" icon="plus" disabled={busy}>
          {busy ? 'Creando…' : 'Crear cuenta'}
        </Button>
        <span className="na-t-label na-muted">El usuario sale solo: …@{slug}</span>
      </div>
      {err ? (
        <p className="nc-form-err" role="alert" style={{ marginTop: 12 }}>
          <Icon name="alert" size={18} />
          {err}
        </p>
      ) : null}
    </form>
  )
}

function Lista({ role, curso, onCreate }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [rowErrors, setRowErrors] = useState({})
  const { rows, header } = useMemo(() => parseList(text), [text])
  const bad = rows.filter((r, i) => r.error || rowErrors[i]).length

  async function submit(e) {
    e.preventDefault()
    if (!rows.length) return setErr('Pega la lista: una persona por línea.')
    if (bad) return setErr('Corrige las líneas marcadas antes de crear las cuentas.')
    if (role === 'estudiante' && !curso) return setErr('Elige su curso.')
    setBusy(true)
    setErr(null)
    setRowErrors({})
    try {
      await onCreate(
        rows.map(r => ({ nombre: r.nombre, apellidos: r.apellidos, nia: r.nia, role, curso: role === 'estudiante' ? curso : '' })),
      )
      setText('')
    } catch (error) {
      const list = error?.response?.data?.rows
      if (Array.isArray(list)) setRowErrors(Object.fromEntries(list.map(x => [x.index, x.error])))
      setErr(serverError(error))
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} noValidate>
      <label className="nc-field">
        <span>Lista</span>
        <small className="na-muted">
          Una persona por línea: nombre, apellidos y NIA (opcional), separados por tabulador, punto y coma o coma. Puedes pegarla tal cual
          desde una hoja de cálculo; si la primera línea es la cabecera («Nombre», «Apellidos»…), se usa su orden.
        </small>
        <textarea
          className="nc-alta-list"
          value={text}
          onChange={e => {
            setText(e.target.value)
            setRowErrors({})
          }}
          placeholder={'Sergi\tColl Pastor\t1001\nAna\tLópez Pérez\t1002'}
          spellCheck={false}
          rows={6}
        />
      </label>
      {rows.length ? (
        <div className="nc-alta-preview">
          <p className="na-t-label" role="status">
            {rows.length} {rows.length === 1 ? 'persona' : 'personas'}
            {header ? ' (con cabecera)' : ''}
            {bad ? ` · ${bad} con errores` : ''}
          </p>
          <div className="nc-table-wrap">
            <table className="nc-table">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Apellidos</th>
                  <th scope="col">NIA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.error || rowErrors[i] ? 'is-bad' : undefined}>
                    {r.error || rowErrors[i] ? (
                      <td colSpan={3}>
                        <span className="nc-row-err">
                          <Icon name="alert" size={15} />
                          {r.error || rowErrors[i]}
                        </span>
                        <span className="na-muted"> {r.line}</span>
                      </td>
                    ) : (
                      <>
                        <td>{r.nombre}</td>
                        <td>{r.apellidos}</td>
                        <td>{r.nia}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <div className="nc-alta-submit">
        <Button variant="primary" type="submit" icon="plus" disabled={busy || !rows.length}>
          {busy ? 'Creando…' : rows.length ? `Crear ${rows.length} ${rows.length === 1 ? 'cuenta' : 'cuentas'}` : 'Crear cuentas'}
        </Button>
        <span className="na-t-label na-muted">Se crean todas o ninguna.</span>
      </div>
      {err ? (
        <p className="nc-form-err" role="alert" style={{ marginTop: 12 }}>
          <Icon name="alert" size={18} />
          {err}
        </p>
      ) : null}
    </form>
  )
}

/* Las recién creadas, con su contraseña temporal: se copian (para una hoja de cálculo) o se imprimen */
function Creadas({ created, cursoName, onClose }) {
  const [copied, setCopied] = useState(false)
  const title = useRef(null)
  /* Sale arriba de la página: se lleva la vista y el foco a ella, para que nadie se quede sin ver las contraseñas */
  useEffect(() => {
    const h = title.current
    if (!h) return
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    h.closest('section')?.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' })
    h.focus({ preventScroll: true })
    setCopied(false)
  }, [created])
  async function copy() {
    try {
      await navigator.clipboard.writeText(toTsv(created, cursoName))
      setCopied(true)
    } catch {
      /* sin portapapeles: se pueden imprimir */
    }
  }
  function print() {
    document.body.classList.add('nc-printing')
    const done = () => {
      document.body.classList.remove('nc-printing')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }
  return (
    <section className="na-card nc-creadas nc-print" aria-labelledby="creadas-t">
      <div className="nc-creadas-head">
        <div>
          <h2 id="creadas-t" className="na-t-title" ref={title} tabIndex={-1}>
            {created.length === 1 ? 'Cuenta nueva' : `${created.length} cuentas nuevas`}
          </h2>
          <p className="na-t-label na-muted nc-noprint">
            Las contraseñas solo se ven ahora. Cópialas o imprímelas antes de salir de esta página.
          </p>
        </div>
        <div className="nc-creadas-actions nc-noprint">
          <Button variant="secondary" icon={copied ? 'check' : 'notes'} onClick={copy}>
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button variant="secondary" icon="download" onClick={print}>
            Imprimir
          </Button>
          <Button variant="ghost" icon="x" label="Cerrar" onClick={onClose} />
        </div>
      </div>
      <div className="nc-table-wrap">
        <table className="nc-table">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Usuario</th>
              <th scope="col">Contraseña temporal</th>
              <th scope="col">Curso</th>
            </tr>
          </thead>
          <tbody>
            {created.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="mono">{c.username}</td>
                <td className="mono pw">{c.password}</td>
                <td>{c.role === 'docente' ? 'Docente' : cursoName(c.curso)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nc-print-only">Entra en NovaClass con tu usuario y esta contraseña. La primera vez tendrás que poner una tuya.</p>
    </section>
  )
}

function Personas({ data, me, cursoName }) {
  const [filter, setFilter] = useState('todas')
  const [q, setQ] = useState('')
  const norm = s =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
  const list = data.users.filter(u => {
    if (filter === 'docentes' && u.role !== 'docente') return false
    if (filter !== 'todas' && filter !== 'docentes' && data.cursoOf[u.id] !== filter) return false
    return !q.trim() || norm(`${u.name} ${u.username}`).includes(norm(q.trim()))
  })
  return (
    <Card title={`Personas · ${data.users.length}`}>
      <div className="nc-personas-filters">
        <div className="nc-chips" role="group" aria-label="Filtrar">
          {[['todas', 'Todas'], ['docentes', 'Docentes'], ...data.cursos.map(c => [c.id, c.name])].map(([v, l]) => (
            <Pill key={v} toggle selected={filter === v} onClick={() => setFilter(v)}>
              {l}
            </Pill>
          ))}
        </div>
        <input
          className="nc-input"
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre o usuario"
          aria-label="Buscar personas"
        />
      </div>
      {list.length ? (
        <ul className="nc-people">
          {list.map(u => (
            <li key={u.id}>
              <Avatar name={u.name} size={36} />
              <span className="nm">
                {u.name}
                <small>
                  {u.username || u.email}
                  {' · '}
                  {u.role === 'docente' ? 'Docente' : cursoName(data.cursoOf[u.id]) || 'Sin curso'}
                  {data.nias[u.id] ? ` · NIA ${data.nias[u.id]}` : ''}
                  {u.must_change_password ? ' · aún no ha puesto su contraseña' : ''}
                </small>
              </span>
              {u.id !== me ? <PasswordReset person={u} compact /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact icon="users" title={data.users.length ? 'Nadie con ese filtro' : 'Aún no hay nadie'}>
          {data.users.length ? 'Prueba con otro curso o borra la búsqueda.' : 'Crea las primeras cuentas arriba.'}
        </EmptyState>
      )}
    </Card>
  )
}
