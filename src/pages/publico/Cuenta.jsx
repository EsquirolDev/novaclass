import { useId, useState } from 'react'
import { Button, Icon } from '../../components/index.js'
import { authError, checkRegister } from '../../lib/authErrors.js'
import { href, navigate } from '../../lib/router.jsx'
import { useAuth } from '../../state/auth.jsx'
import { PublicHeader } from './PublicHeader.jsx'

/* Pantallas de cuenta: entrar, crear cuenta y recuperar la contraseña. Mismo esqueleto y mismos campos. */

function AuthLayout({ title, lead, children, foot }) {
  return (
    <div className="nc-pub">
      <PublicHeader minimal />
      <main className="nc-auth">
        <div className="nc-auth-card">
          <h1 className="na-t-display">{title}</h1>
          {lead ? <p className="nc-auth-lead">{lead}</p> : null}
          {children}
        </div>
        {foot ? <p className="nc-auth-foot">{foot}</p> : null}
      </main>
    </div>
  )
}

function Field({ label, error, hint, children, id }) {
  return (
    <div className="nc-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error ? (
        <small className="na-muted" id={id + '-hint'}>
          {hint}
        </small>
      ) : null}
      {error ? (
        <span className="nc-err" id={id + '-err'}>
          {error}
        </span>
      ) : null}
    </div>
  )
}

function TextInput({ id, error, hint, ...rest }) {
  return (
    <input
      id={id}
      className="nc-input"
      aria-invalid={!!error}
      aria-describedby={error ? id + '-err' : hint ? id + '-hint' : undefined}
      {...rest}
    />
  )
}

/* Contraseña con botón para verla (mejor que pedirla dos veces) */
function PasswordInput({ id, error, hint, ...rest }) {
  const [show, setShow] = useState(false)
  return (
    <div className="nc-pass">
      <TextInput id={id} error={error} hint={hint} type={show ? 'text' : 'password'} {...rest} />
      <button
        type="button"
        className="nc-pass-btn"
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        onClick={() => setShow(s => !s)}
      >
        <Icon name={show ? 'eye-off' : 'eye'} size={20} />
      </button>
    </div>
  )
}

function FormError({ children }) {
  return children ? (
    <p className="nc-form-err" role="alert">
      <Icon name="alert" size={18} />
      {children}
    </p>
  ) : null
}

/* `next`: a dónde volver después de entrar (si llegaste a una pantalla de la app sin sesión) */
export function Entrar({ next }) {
  const { login } = useAuth()
  const id = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return setErr({ form: 'Escribe tu correo y tu contraseña.', fields: {} })
    setBusy(true)
    setErr(null)
    try {
      await login(email, password)
      navigate(next || '/')
    } catch (error) {
      setErr(authError(error, 'login'))
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      lead={next ? 'Entra con tu cuenta para ver esa página.' : 'Hola de nuevo.'}
      foot={
        <>
          ¿Aún no tienes cuenta? <a href={href('/registro')}>Crear cuenta</a>
        </>
      }
    >
      <form className="nc-auth-form" onSubmit={submit} noValidate>
        <FormError>{err?.form}</FormError>
        <Field label="Correo" id={id + 'e'}>
          <TextInput id={id + 'e'} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Contraseña" id={id + 'p'}>
          <PasswordInput id={id + 'p'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        </Field>
        <a className="nc-auth-link" href={href('/recuperar')}>
          ¿Has olvidado la contraseña?
        </a>
        <Button variant="primary" size="lg" block type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export function Registro() {
  const { register } = useAuth()
  const id = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    const fields = checkRegister({ name, email, password })
    if (Object.keys(fields).length) return setErr({ form: null, fields })
    setBusy(true)
    setErr(null)
    try {
      await register({ name, email, password })
      navigate('/')
    } catch (error) {
      setErr(authError(error, 'register'))
      setBusy(false)
    }
  }
  const f = err?.fields || {}

  return (
    <AuthLayout
      title="Crear cuenta"
      lead="Con tu cuenta podrás entrar en tu clase con su código, o crear tu escuela."
      foot={
        <>
          ¿Ya tienes cuenta? <a href={href('/entrar')}>Entrar</a>
        </>
      }
    >
      <form className="nc-auth-form" onSubmit={submit} noValidate>
        <FormError>{err?.form}</FormError>
        <Field label="Nombre y apellidos" id={id + 'n'} error={f.name} hint="Así te verá tu clase.">
          <TextInput
            id={id + 'n'}
            autoComplete="name"
            value={name}
            maxLength={120}
            onChange={e => setName(e.target.value)}
            error={f.name}
            hint="Así te verá tu clase."
            autoFocus
          />
        </Field>
        <Field label="Correo" id={id + 'e'} error={f.email}>
          <TextInput
            id={id + 'e'}
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={f.email}
          />
        </Field>
        <Field label="Contraseña" id={id + 'p'} error={f.password} hint="Al menos 8 caracteres.">
          <PasswordInput
            id={id + 'p'}
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={f.password}
            hint="Al menos 8 caracteres."
          />
        </Field>
        <Button variant="primary" size="lg" block type="submit" disabled={busy}>
          {busy ? 'Creando la cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export function Recuperar() {
  const { requestReset } = useAuth()
  const id = useId()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr({ form: null, fields: { email: 'Ese correo no parece válido.' } })
    setBusy(true)
    setErr(null)
    try {
      await requestReset(email)
      setSent(true)
    } catch (error) {
      setErr(authError(error, 'reset'))
    }
    setBusy(false)
  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      lead="Te enviamos un enlace para crear una contraseña nueva."
      foot={<a href={href('/entrar')}>Volver a entrar</a>}
    >
      {sent ? (
        <p className="nc-form-ok" role="status">
          <Icon name="check" size={20} strokeWidth={2.6} />
          Si hay una cuenta con ese correo, te llegará el enlace en unos minutos. Mira también en spam.
        </p>
      ) : (
        <form className="nc-auth-form" onSubmit={submit} noValidate>
          <FormError>{err?.form}</FormError>
          <Field label="Correo" id={id + 'e'} error={err?.fields?.email}>
            <TextInput
              id={id + 'e'}
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={err?.fields?.email}
              autoFocus
            />
          </Field>
          <Button variant="primary" size="lg" block type="submit" disabled={busy}>
            {busy ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
