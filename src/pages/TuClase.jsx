import { useEffect, useState } from 'react'
import { Avatar, Button, Card, ConfirmDialog, Icon, JoinForm } from '../components/index.js'
import { formatCode } from '../lib/codes.js'
import { useClase } from '../state/clase.jsx'

const CARGO = { tutor: 'Tutor', delegado: 'Delegado', subdelegado: 'Subdelegado' }
const personName = m => m.expand?.user?.name || m.pending_name || 'Alguien'

/*
 * Tu clase: quién hay (Docentes con el Tutor, Estudiantes con Delegado y Subdelegado), el código para que entre gente
 * (solo lo ven el Tutor y la dirección) y entrar en otra clase con su código.
 */
export default function TuClase() {
  const clase = useClase()
  const { group, school, members = [], me } = clase
  const canCode = me?.cargo === 'tutor' || me?.director
  const sorted = list => [...list].sort((a, b) => (a.cargo ? 0 : 1) - (b.cargo ? 0 : 1) || personName(a).localeCompare(personName(b), 'es'))
  const docentes = sorted(members.filter(m => m.role === 'docente'))
  const estudiantes = sorted(members.filter(m => m.role === 'estudiante'))

  if (!group) return null
  return (
    <div className="nc-screen">
      <main className="nc-pad nc-clase">
        <div className="nc-top">
          <div>
            <p className="na-t-eyebrow na-muted nc-clase-school">
              {school?.name}
              {school?.verified ? <Icon name="shield" size={15} label="Escuela verificada" /> : null}
            </p>
            <h1 className="na-t-display-xl">{group.name}</h1>
            <p className="na-t-subtitle na-muted">
              Curso {group.course} · {docentes.length} Docentes · {estudiantes.length} Estudiantes
            </p>
          </div>
        </div>
        <div className="nc-clase-grid">
          <div className="nc-clase-people">
            <PeopleCard title="Docentes" list={docentes} />
            <PeopleCard title="Estudiantes" list={estudiantes} />
          </div>
          <aside className="nc-side">
            {canCode ? <CodeCard groupId={group.id} /> : null}
            <Card title="Entrar en otra clase">
              <p className="na-t-label na-muted" style={{ margin: '0 0 12px' }}>
                Si también vas a otra clase, escribe su código.
              </p>
              <JoinForm />
            </Card>
          </aside>
        </div>
      </main>
    </div>
  )
}

function PeopleCard({ title, list }) {
  return (
    <Card title={`${title} · ${list.length}`}>
      {list.length ? (
        <ul className="nc-people">
          {list.map(m => (
            <li key={m.id}>
              <Avatar name={personName(m)} size={36} />
              <span className="nm">
                {personName(m)}
                {!m.user ? <small>Aún no ha entrado en NovaClass</small> : null}
              </span>
              {m.cargo ? <span className="nc-cargo">{CARGO[m.cargo]}</span> : null}
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

/* El código para que entre gente: se ve, se copia y se cambia si se ha filtrado */
function CodeCard({ groupId }) {
  const { getCode, newCode } = useClase()
  const [code, setCode] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let alive = true
    getCode(groupId).then(
      c => alive && setCode(c),
      () => alive && setError('No se ha podido cargar el código.'),
    )
    return () => {
      alive = false
    }
  }, [groupId, getCode])

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
    <Card title="Código de la clase">
      <p className="na-t-label na-muted" style={{ margin: '0 0 14px' }}>
        Con él, quien tenga cuenta entra en la clase como Estudiante. Solo lo ves tú (Tutor) y la dirección.
      </p>
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
        title="¿Cambiar el código de la clase?"
        confirmLabel="Cambiar código"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false)
          try {
            setCode(await newCode(groupId))
          } catch {
            setError('No se ha podido cambiar el código.')
          }
        }}
      >
        El código actual dejará de servir. Quien ya está en la clase sigue dentro; solo cambia para quien entre a partir de ahora.
      </ConfirmDialog>
    </Card>
  )
}
