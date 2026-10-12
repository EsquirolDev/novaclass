import { useEffect, useId, useRef, useState } from 'react'
import { pb } from '../lib/pb.js'
import { Button } from './controls.jsx'
import { Icon } from './Icon.jsx'

/*
 * «Nueva contraseña» para alguien que la ha olvidado (la dirección, o el Tutor para su alumnado). Primero se confirma;
 * luego sale la contraseña temporal, que solo se ve esta vez, para pasársela. Al entrar tendrá que cambiarla.
 * Ruta: POST /api/novaclass/cuentas/{id}/clave (pb_hooks/cuentas.pb.js).
 */
export function PasswordReset({ person, compact }) {
  const [step, setStep] = useState(null) // null | 'confirm' | 'busy' | 'done' | 'error'
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)
  const id = useId()
  const open = step !== null

  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  function close() {
    setStep(null)
    setResult(null)
    setCopied(false)
  }

  async function reset() {
    setStep('busy')
    try {
      setResult(await pb.send(`/api/novaclass/cuentas/${person.id}/clave`, { method: 'POST' }))
      setStep('done')
    } catch {
      setStep('error')
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${result.username}\t${result.password}`)
      setCopied(true)
    } catch {
      /* sin portapapeles: se ve en pantalla */
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        icon="key"
        label={compact ? 'Nueva contraseña para ' + person.name : undefined}
        onClick={() => setStep('confirm')}
      >
        {compact ? null : 'Nueva contraseña'}
      </Button>
      <dialog
        ref={ref}
        className="nc-dialog"
        aria-labelledby={id + 't'}
        onCancel={e => {
          e.preventDefault()
          if (step !== 'busy') close()
        }}
      >
        {open ? (
          <div className="nc-dialog-box">
            <span className="nc-dialog-icon" aria-hidden="true">
              <Icon name={step === 'error' ? 'alert' : 'key'} size={24} />
            </span>
            <h2 id={id + 't'} className="na-t-title">
              {step === 'done' ? 'Contraseña temporal' : `¿Nueva contraseña para ${person.name}?`}
            </h2>
            {step === 'done' ? (
              <>
                <p className="nc-dialog-text">Pásasela a {person.name}. Solo se ve ahora: al entrar tendrá que poner una suya.</p>
                <dl className="nc-temp">
                  <dt>Usuario</dt>
                  <dd>{result.username || '—'}</dd>
                  <dt>Contraseña</dt>
                  <dd className="pw">{result.password}</dd>
                </dl>
                <div className="nc-dialog-actions">
                  <Button variant="secondary" icon={copied ? 'check' : 'notes'} onClick={copy}>
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                  <Button variant="primary" onClick={close} autoFocus>
                    Hecho
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="nc-dialog-text">
                  {step === 'error'
                    ? 'No se ha podido cambiar la contraseña. Revisa la conexión y vuelve a intentarlo.'
                    : 'Su contraseña actual dejará de servir y se cerrarán sus sesiones abiertas. Le saldrá una temporal para que la cambie al entrar.'}
                </p>
                <div className="nc-dialog-actions">
                  <Button variant="secondary" onClick={close} autoFocus disabled={step === 'busy'}>
                    Cancelar
                  </Button>
                  <Button variant="primary" icon="key" onClick={reset} disabled={step === 'busy'}>
                    {step === 'busy' ? 'Generando…' : step === 'error' ? 'Reintentar' : 'Dar contraseña nueva'}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </dialog>
    </>
  )
}
