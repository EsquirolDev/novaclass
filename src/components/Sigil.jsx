import { SUBJECTS, subjectOf, subjectVars } from '../data/subjects.js'
import { cx } from '../lib/cx.js'

/* La forma de cada asignatura. Nunca el color solo: forma + código siempre juntos. */
export function ShapeEl({ shape, ...extra }) {
  if (shape === 'circle') return <circle cx={8} cy={8} r={6.6} {...extra} />
  if (shape === 'square') return <rect x={1.6} y={1.6} width={12.8} height={12.8} rx={3} {...extra} />
  if (shape === 'triangle') return <path d="M8 1.6 14.8 14H1.2z" strokeLinejoin="round" {...extra} />
  if (shape === 'diamond') return <path d="M8 .9 15.1 8 8 15.1.9 8z" strokeLinejoin="round" {...extra} />
  if (shape === 'pentagon') return <path d="M8 1.2 14.8 6.2 12.2 14.4H3.8L1.2 6.2z" strokeLinejoin="round" {...extra} />
  if (shape === 'star')
    return <path d="M8 .8 10.1 5.4 15.2 6 11.4 9.4 12.5 14.5 8 11.9 3.5 14.5 4.6 9.4.8 6 5.9 5.4z" strokeLinejoin="round" {...extra} />
  if (shape === 'cross') return <path d="M5.6 1.2h4.8v4.4h4.4v4.8h-4.4v4.4H5.6v-4.4H1.2V5.6h4.4z" strokeLinejoin="round" {...extra} />
  return <path d="M8 1 14.1 4.5v7L8 15 1.9 11.5v-7z" strokeLinejoin="round" {...extra} />
}

export function Sigil({ subject, size = 12, variant, tone, label, strokeWidth, className, style }) {
  const s = subjectOf(subject) || SUBJECTS.pro
  const color = tone === 'current' ? 'currentColor' : `var(--${s.id})`
  const paint =
    variant === 'outline'
      ? { fill: 'none', stroke: color, strokeWidth: strokeWidth || (16 / size) * 1.2 }
      : { fill: color, stroke: color, strokeWidth: 0.6 }
  return (
    <svg
      className={cx('na-sigil', className)}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
      style={style}
    >
      {label ? <title>{s.name}</title> : null}
      <ShapeEl shape={s.shape} {...paint} />
    </svg>
  )
}

/* Etiqueta de asignatura (no interactiva) */
export function SubjectTag({ subject, variant = 'soft', size, showName, className }) {
  const s = subjectOf(subject) || SUBJECTS.pro
  return (
    <span
      className={cx('na-tag', `na-tag--${variant}`, size === 'lg' && 'na-tag--lg', className)}
      style={subjectVars(s.id)}
      title={showName ? undefined : s.name}
    >
      <Sigil subject={s.id} size={size === 'lg' ? 13 : 11} tone="current" />
      <span>{s.code}</span>
      {showName ? <span className="na-tag-name">{s.name}</span> : <span className="na-sr">{' ' + s.name}</span>}
    </span>
  )
}
