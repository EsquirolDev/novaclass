import { SUBJECTS, subjectVars } from '../data/subjects.js'
import { cx } from '../lib/cx.js'
import { href } from '../lib/router.jsx'
import { Icon } from './Icon.jsx'
import { ShapeEl, Sigil } from './Sigil.jsx'

/* Tarjeta; con `subject` se convierte en carpeta (pestaña con sigilo + código y borde superior del color). */
export function Card({ subject, tab, title, titleAs, action, children, className, flush, as, ...rest }) {
  const Tag = as || 'section'
  const TitleTag = titleAs || 'h2'
  const head = (title || action) ? (
    <div className="na-card-head">
      {typeof title === 'string' ? <TitleTag className="na-t-title">{title}</TitleTag> : title}
      {action || null}
    </div>
  ) : null
  const card = (
    <Tag {...rest} className={cx('na-card', flush && 'na-card--flush', !subject && className)}>
      {head}
      {children}
    </Tag>
  )
  if (!subject) return card
  const s = SUBJECTS[subject]
  return (
    <div className={cx('na-folder', className)} style={subjectVars(s.id)}>
      <div className="na-folder-tab">
        <Sigil subject={s.id} size={12} tone="current" />{tab || s.code}
        <svg className="na-folder-curve" viewBox="0 0 18 18" aria-hidden="true"><path d="M0 0h1a16 16 0 0 0 16 16h1v2H0z" /></svg>
      </div>
      {card}
    </div>
  )
}

/* Bloque sólido del color de la asignatura. Uno por pantalla. */
export function Hero({ subject, label, className, children }) {
  const s = SUBJECTS[subject] || SUBJECTS.pro
  return (
    <section className={cx('na-hero', className)} style={subjectVars(s.id)} aria-label={label}>
      <svg className="na-hero-deco" viewBox="0 0 16 16" aria-hidden="true">
        <ShapeEl shape={s.shape} fill="none" stroke="currentColor" strokeWidth={1.6} />
      </svg>
      <div style={{ position: 'relative' }}>{children}</div>
    </section>
  )
}

/* Progreso por segmentos: un segmento = una entrega */
export function ProgressSegments({ done = 0, total = 1, subject, label, noun = 'entregas', hideLabel, tone, ariaLabel, className }) {
  total = Math.max(total, 1)
  const useBar = total > 14
  return (
    <div className={cx('na-progress', tone === 'oncolor' && 'na-progress--oncolor', className)} style={subjectVars(subject)}>
      {hideLabel ? null : (
        <div className="na-progress-label">
          <span>{label || 'Progreso'}</span>
          <span><strong>{done + '/' + total}</strong>{' ' + noun}</span>
        </div>
      )}
      <div
        className={cx('na-progress-track', useBar && 'na-progress-track--bar')} role="progressbar"
        aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
        aria-label={(ariaLabel || (subject ? SUBJECTS[subject].name + ': ' : '')) + `${done} de ${total} ${noun} hechas`}
      >
        {useBar
          ? <span className="na-progress-fill" style={{ width: (done / total) * 100 + '%' }} />
          : Array.from({ length: total }, (_, i) => <span key={i} className={cx('na-progress-seg', i < done && 'is-done')} />)}
      </div>
    </div>
  )
}

export function ListRow({ leading, title, meta, trailing, done, subject, as, className, style, to, ...rest }) {
  if (to) rest.href = href(to)
  const Tag = as || (rest.href ? 'a' : rest.onClick ? 'button' : 'div')
  const attrs = { ...rest, className: cx('na-row', done && 'is-done', className), style: { ...subjectVars(subject), ...style } }
  if (Tag === 'button' && !attrs.type) attrs.type = 'button'
  return (
    <Tag {...attrs}>
      {leading ? <span className="na-row-lead">{leading}</span> : null}
      <span className="na-row-main">
        <span className="na-row-title">{title}</span>
        {meta ? <span className="na-row-meta">{meta}</span> : null}
      </span>
      {trailing ? <span className="na-row-trail">{trailing}</span> : null}
    </Tag>
  )
}

/* Chip de evento: entrega (tinte suave) vs examen (relleno sólido + bandera) */
export function EventChip({ type = 'entrega', subject, title, time, done, compact, selected, onClick, className }) {
  const s = SUBJECTS[subject]
  const isExam = type === 'examen'
  const isHoliday = type === 'festivo'
  const Tag = onClick ? 'button' : 'div'
  const label = (isExam ? 'Examen' : isHoliday ? 'Festivo' : 'Entrega') + (s ? ' de ' + s.name : '') + ': ' + title + (time ? ', ' + time : '') + (done ? ' (hecha)' : '')
  const attrs = {
    className: cx('na-chip', `na-chip--${type}`, done && 'is-done', compact && 'is-compact', selected && 'is-selected', className),
    style: subjectVars(subject), onClick, 'aria-label': label, title: label,
  }
  if (Tag === 'button') { attrs.type = 'button'; attrs['aria-pressed'] = !!selected }
  const lead = done ? <Icon name="check" size={14} strokeWidth={2.6} />
    : isExam ? <Icon name="flag" size={14} strokeWidth={2.4} />
    : isHoliday ? null
    : <Sigil subject={subject} size={11} tone="current" />
  return (
    <Tag {...attrs}>
      {lead}
      {isExam && !compact ? <span className="na-chip-kind">Examen</span> : null}
      <span className="na-chip-text">{title}</span>
      {time && !compact ? <span className="na-num" style={{ fontWeight: 700 }}>{time}</span> : null}
    </Tag>
  )
}

const pad = n => (n < 10 ? '0' : '') + n

export function Countdown({ days = 0, hours = 0, minutes = 0, size, className }) {
  const units = [[days, days === 1 ? 'día' : 'días'], [pad(hours), 'horas'], [pad(minutes), 'min']]
  return (
    <div
      className={cx('na-count', size === 'sm' && 'na-count--sm', className)} role="timer"
      aria-label={`Faltan ${days}${days === 1 ? ' día, ' : ' días, '}${hours} horas y ${minutes} minutos`}
    >
      {units.map((u, i) => (
        <div key={i} className="na-count-unit" aria-hidden="true">
          <span className="na-count-num">{u[0]}</span>
          <span className="na-count-lbl">{u[1]}</span>
        </div>
      ))}
    </div>
  )
}

function initials(name) {
  return String(name || '?').split(/\s+/).map(p => p.charAt(0)).join('').slice(0, 2).toUpperCase()
}

/* Avatar neutro: el color queda reservado a las asignaturas */
export function Avatar({ name, size = 36, me, className }) {
  return (
    <span
      className={cx('na-avatar', me && 'is-me', className)} role="img" aria-label={name}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </span>
  )
}

export function StatusBadge({ status = 'sin-responder', answers }) {
  if (status === 'resuelta') return <span className="na-status na-status--resuelta"><Icon name="check" size={14} strokeWidth={2.8} />Resuelta</span>
  if (status === 'sin-responder') return <span className="na-status na-status--sin-responder"><Icon name="clock" size={14} strokeWidth={2.4} />Sin responder</span>
  return <span className="na-status na-status--abierta"><Icon name="message" size={14} strokeWidth={2.4} />{answers + (answers === 1 ? ' respuesta' : ' respuestas')}</span>
}

const FILE = { pdf: ['pdf', 'PDF'], enlace: ['link', 'Enlace'], nota: ['note', 'Nota'] }

export function FileBadge({ type, className }) {
  const f = FILE[type] || FILE.nota
  return <span className={cx('na-file', className)}><Icon name={f[0]} size={14} strokeWidth={2.4} />{f[1]}</span>
}

export function SectionTitle({ children, action, to, end, as, className }) {
  const T = as || 'h2'
  return (
    <div className={cx('na-sectitle', className)}>
      <T className="na-t-title">{children}</T>
      {action
        ? <a className="na-link" href={href(to || '/')}>{action}<Icon name="arrow-right" size={16} strokeWidth={2.4} /></a>
        : end || null}
    </div>
  )
}
