import { useEffect, useState } from 'react'
import { Avatar, Button, Card, ConfirmDialog, Icon, JoinForm, PasswordReset, SubjectTag } from '../components/index.js'
import { formatCode } from '../lib/codes.js'
import { pb } from '../lib/pb.js'
import { useAuth } from '../state/auth.jsx'
import { useClase } from '../state/clase.jsx'

const CARGO = { tutor: 'Tutor', delegado: 'Delegado', subdelegado: 'Subdelegado' }

/*
 * Tu clase (el curso): quién hay (Docentes con el Tutor, Estudiantes con Delegado y Subdelegado), los códigos de las
 * asignaturas para que entre el alumnado (solo los ven sus Docentes y la dirección) y, para quien aún no ha entrado en
 * alguna asignatura, dónde escribir su código.
 */
export default function TuClase() {
  const clase = useClase()
  const { user } = useAuth()
  const { curso, school, people, me, asignaturas = [], locked = [] } = clase
  /* El Tutor y la dirección ven el NIA del alumnado y le dan contraseña nueva si la olvida */
  const manage = !!(me?.cargo === 'tutor' || me?.director)
  const nias = useNias(curso?.id, manage)
  if (!curso || !people) return null
  const byCargo = list => [...list].sort((a, b) => (a.cargo ? 0 : 1) - (b.cargo ? 0 : 1))
  const docentes = byCargo(people.docentes)
  const estudiantes = byCargo(people.estudiantes)
  const withCode = asignaturas.filter(a => a.activa && (me?.director || (a.docentes || []).includes(user?.id)))
  return (
    <div className="nc-screen">
      <main className="nc-pad nc-clase">
        <div className="nc-top">
          <div>
            <p className="na-t-eyebrow na-muted nc-clase-school">
              {school?.name}
              {school?.verified ? <Icon name="shield" size={15} label="Escuela verificada" /> : null}
            </p>
            <h1 className="na-t-display-xl">{curso.name}</h1>
            <p className="na-t-subtitle na-muted">
              Curso {curso.course} · {docentes.length} Docentes · {estudiantes.length} Estudiantes
            </p>
          </div>
        </div>
        <div className="nc-clase-grid">
          <div className="nc-clase-people">
            <PeopleCard title="Docentes" list={docentes} />
            <PeopleCard title="Estudiantes" list={estudiantes} manage={manage} nias={nias} />
          </div>
          <aside className="nc-side">
            {withCode.length ? (
              <Card title={withCode.length > 1 ? 'Códigos de las asignaturas' : 'Código de la asignatura'}>
                <p className="na-t-label na-muted" style={{ margin: '0 0 14px' }}>
                  Con el código, el alumnado del curso entra en el espacio de la asignatura (entregas, apuntes y dudas). Solo los ven sus
                  Docentes y la dirección.
                </p>
                <div className="nc-codes">
                  {withCode.map(a => (
                    <CodeRow key={a.id} asignatura={a} />
                  ))}
                </div>
              </Card>
            ) : null}
            {locked.length ? (
              <Card title="Entrar en una asignatura">
                <p className="na-t-label na-muted" style={{ margin: '0 0 12px' }}>
                  Aún no has entrado en {locked.length > 1 ? 'estas asignaturas' : 'esta asignatura'}. Pide el código a quien la da.
                </p>
                <div className="nc-locked">
                  {locked.map(id => (
                    <SubjectTag key={id} subject={id} />
                  ))}
                </div>
                <JoinForm />
              </Card>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  )
}

function useNias(cursoId, on) {
  const [nias, setNias] = useState({})
  useEffect(() => {
    if (!cursoId || !on) return undefined
    let alive = true
    pb.send(`/api/novaclass/cursos/${cursoId}/nias`, { method: 'GET' }).then(
      n => alive && setNias(n),
      () => {},
    )
    return () => {
      alive = false
    }
  }, [cursoId, on])
  return nias
}

function PeopleCard({ title, list, manage, nias = {} }) {
  return (
    <Card title={`${title} · ${list.length}`}>
      {list.length ? (
        <ul className="nc-people">
          {list.map(p => (
            <li key={p.id}>
              <Avatar name={p.name} size={36} />
              <span className="nm">
                {p.name}
                {p.codes?.length ? <small>{p.codes.join(' · ')}</small> : null}
                {manage && nias[p.id] ? <small>NIA {nias[p.id]}</small> : null}
              </span>
              {p.cargo ? <span className="nc-cargo">{CARGO[p.cargo]}</span> : null}
              {manage ? <PasswordReset person={p} compact /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="na-muted" style={{ margin: 0 }}>
          Nadie todavía.
        </p>
      )}
    </Card>
  )
}

/* El código de una asignatura: se ve, se copia y se cambia si se ha filtrado */
function CodeRow({ asignatura }) {
  const id = asignatura.id
  const { getCode, newCode } = useClase()
  const [code, setCode] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let alive = true
    getCode(id).then(
      c => alive && setCode(c),
      () => alive && setError('No se ha podido cargar el código.'),
    )
    return () => {
      alive = false
    }
  }, [id, getCode])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se ha podido copiar: selecciónalo y cópialo a mano.')
    }
  }

  return (
    <div className="nc-code-row">
      <SubjectTag subject={id} showName />
      {code ? (
        <>
          <p className="nc-code" aria-label={'Código: ' + code.split('').join(' ')}>
            {formatCode(code)}
          </p>
          <div className="nc-code-actions">
            <Button variant="secondary" icon={copied ? 'check' : 'notes'} onClick={copy}>
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              Cambiar código
            </Button>
          </div>
        </>
      ) : error ? null : (
        <p className="na-muted">Cargando…</p>
      )}
      {error ? (
        <p className="nc-form-err" role="alert" style={{ marginTop: 12 }}>
          <Icon name="alert" size={18} />
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirming}
        icon="alert"
        title={`¿Cambiar el código de ${asignatura.codigo}?`}
        confirmLabel="Cambiar código"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false)
          try {
            setCode(await newCode(id))
          } catch {
            setError('No se ha podido cambiar el código.')
          }
        }}
      >
        El código actual dejará de servir. Quien ya ha entrado sigue dentro; solo cambia para quien entre a partir de ahora.
      </ConfirmDialog>
    </div>
  )
}
