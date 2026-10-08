import { useId, useState } from 'react'
import { formatCode } from '../lib/codes.js'
import { navigate } from '../lib/router.jsx'
import { useClase } from '../state/clase.jsx'
import { Button } from './controls.jsx'
import { Icon } from './Icon.jsx'

/* Escribir el código de una asignatura y entrar en su espacio (entregas, apuntes y dudas); luego se va a ella */
export function JoinForm({ onJoined, autoFocus }) {
  const { join } = useClase()
  const id = useId()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const raw = code.replace('-', '')

  async function submit(e) {
    e.preventDefault()
    if (raw.length !== 8) return setError('El código tiene 8 letras y números.')
    setBusy(true)
    setError(null)
    try {
      const res = await join(raw)
      if (onJoined) onJoined(res)
      else navigate('/asignaturas/' + res.asignatura)
    } catch (err) {
      setError(
        err?.status === 0 ? 'No se puede conectar con el servidor.' : err?.response?.message || 'No se ha podido entrar en la asignatura.',
      )
      setBusy(false)
    }
  }

  return (
    <form className="nc-join" onSubmit={submit} noValidate>
      <label htmlFor={id}>Código de la asignatura</label>
      <div className="row">
        <input
          id={id}
          className="nc-input nc-join-code"
          value={code}
          onChange={e => setCode(formatCode(e.target.value))}
          placeholder="ABCD-2345"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          aria-invalid={!!error}
          aria-describedby={error ? id + '-err' : id + '-hint'}
          autoFocus={autoFocus}
        />
        <Button variant="primary" type="submit" icon="check" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </div>
      {error ? (
        <p className="nc-form-err" id={id + '-err'} role="alert">
          <Icon name="alert" size={18} />
          {error}
        </p>
      ) : (
        <small className="na-muted" id={id + '-hint'}>
          Te lo da quien da la asignatura. Son 8 letras y números.
        </small>
      )}
    </form>
  )
}
