import { useId, useState } from 'react'
import { Button, Icon } from '../../components/index.js'
import { authError, checkNewPassword } from '../../lib/authErrors.js'
import { firstName } from '../../lib/users.js'
import { href, navigate } from '../../lib/router.jsx'
import { useAuth } from '../../state/auth.jsx'
import { PublicHeader } from './PublicHeader.jsx'

/*
 * Pantallas de cuenta: entrar, recuperar la contraseña y cambiar la temporal. Mismo esqueleto y mismos campos. No hay
 * registro: las cuentas las crea la escuela.
 */

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
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!identity.trim() || !password) return setErr({ form: 'Escribe tu usuario y tu contraseña.', fields: {} })
    setBusy(true)
    setErr(null)
    try {
      await login(identity, password)
      navigate(next || '/')
    } catch (error) {
      setErr(authError(error, 'login'))
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      lead={next ? 'Entra con tu cuenta para ver esa página.' : 'Con el usuario y la contraseña que te ha dado tu escuela.'}
      foot="¿Aún no tienes cuenta? Te la da tu escuela: pregunta a tu Tutor o en secretaría."
    >
      <form className="nc-auth-form" onSubmit={submit} noValidate>
        <FormError>{err?.form}</FormError>
        <Field label="Usuario o correo" id={id + 'e'} hint="Por ejemplo, scollp@santjosepobrer">
          <TextInput
            id={id + 'e'}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={identity}
            onChange={e => setIdentity(e.target.value)}
            hint="Por ejemplo, scollp@santjosepobrer"
            autoFocus
          />
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

/*
 * Primera vez con la contraseña temporal de la escuela (o una que ha dado el Tutor): hay que poner una propia antes de
 * seguir. Sale en lugar de la app mientras users.must_change_password esté a true.
 */
export function CambiarClave() {
  const { user, changePassword, logout } = useAuth()
  const id = useId()
  const [old, setOld] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    const fields = checkNewPassword({ old, password })
    if (Object.keys(fields).length) return setErr({ form: null, fields })
    setBusy(true)
    setErr(null)
    try {
      await changePassword(old, password)
    } catch (error) {
      setErr(authError(error, 'change'))
      setBusy(false)
    }
  }
  const f = err?.fields || {}

  return (
    <AuthLayout
      title="Pon tu contraseña"
      lead={`Hola, ${firstName(user)}. Has entrado con una contraseña temporal: cámbiala por una tuya para seguir.`}
      foot={
        <button type="button" className="nc-auth-linkbtn" onClick={logout}>
          Cerrar sesión
        </button>
      }
    >
      <form className="nc-auth-form" onSubmit={submit} noValidate>
        <FormError>{err?.form}</FormError>
        {user?.username ? (
          <p className="nc-auth-user">
            Tu usuario: <b>{user.username}</b>
          </p>
        ) : null}
        <Field label="Contraseña temporal" id={id + 'o'} error={f.oldPassword}>
          <PasswordInput
            id={id + 'o'}
            autoComplete="current-password"
            value={old}
            onChange={e => setOld(e.target.value)}
            error={f.oldPassword}
            autoFocus
          />
        </Field>
        <Field label="Contraseña nueva" id={id + 'p'} error={f.password} hint="Al menos 8 caracteres. Solo la sabrás tú.">
          <PasswordInput
            id={id + 'p'}
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={f.password}
            hint="Al menos 8 caracteres. Solo la sabrás tú."
          />
        </Field>
        <Button variant="primary" size="lg" block type="submit" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar y entrar'}
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
      lead="Si entras con el usuario de tu escuela, pide una contraseña nueva a tu Tutor o a la dirección. Si tu cuenta tiene correo, te enviamos un enlace."
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
